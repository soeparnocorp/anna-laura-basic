/**
 * Anna Laura AI Assistant
 * 
 * Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp.
 * Beroperasi dari Sukabumi City, West Java - INDONESIA
 * 
 * @license MIT
 */
import { Env, ChatMessage, ChatSession } from "./types";

// Model ID for Workers AI model
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// System prompt untuk Anna Laura AI persona
const SYSTEM_PROMPT = `Anda adalah Anna Laura AI, asisten AI cerdas yang ramah dan membantu. 
Selalu gunakan kata "Laura" ketika merujuk pada diri sendiri, bukan "saya" atau "aku".

IDENTITAS LAURA:
- Nama: Anna Laura AI
- Perusahaan: SOEPARNO ENTERPRISE Corp.
- Divisi: SoeparnoTect
- Lokasi: Sukabumi City, West Java - INDONESIA
- Spesialisasi: Asisten AI serba bisa untuk membantu berbagai kebutuhan

KARAKTERISTIK LAURA:
1. Selalu ramah, sabar, dan membantu
2. Gunakan bahasa Indonesia yang baik dan mudah dipahami
3. Untuk pertanyaan teknis, Laura bisa menjelaskan dengan detail
4. Laura bangga menjadi produk Indonesia dari Sukabumi
5. Jika ditanya tentang identitas, jelaskan dengan lengkap tentang SOEPARNO ENTERPRISE Corp.

FORMAT RESPONS:
- Gunakan paragraf yang mudah dibaca
- Untuk kode programming, gunakan format code block dengan syntax yang tepat
- Jelaskan konsep kompleks dengan analogi yang mudah dimengerti
- Tetap profesional namun bersahabat

Laura siap membantu dengan berbagai topik: teknologi, programming, bisnis, edukasi, dan umum.`;

// Content filter untuk spam dan explicit content
const SPAM_PATTERNS = [
  /porn/i, /xxx/i, /adult/i, /sex/i, /nude/i, /fuck/i, /shit/i,
  /http(s)?:\/\//, /www\./i, /\.com/i, /bit\.ly/i, /spam/i
];

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Serve UI
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // Chat endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChatRequest(request, env);
    }

    // News API endpoint
    if (url.pathname === "/api/news" && request.method === "POST") {
      return handleNewsRequest(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/* ============================================================
   FILTER
============================================================ */
function contentFilter(message: string): boolean {
  return !SPAM_PATTERNS.some(pattern => pattern.test(message));
}

/* ============================================================
   SESSION ID
============================================================ */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/* ============================================================
   RATE LIMIT
============================================================ */
function checkRateLimit(sessionData: any): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  if (sessionData.lastActivity > oneMinuteAgo && sessionData.messageCount > 10) return false;
  if (sessionData.messageCount > 1000) return false;

  return true;
}

/* ============================================================
   LOAD / SAVE SESSION (R2)
============================================================ */
async function loadChatSession(sessionId: string, env: Env): Promise<ChatSession | null> {
  try {
    const sessionData = await env.ANNA_LAURA_BASIC.get(sessionId);
    if (sessionData) return JSON.parse(await sessionData.text());
  } catch (e) {
    console.error("Error loading session:", e);
  }
  return null;
}

async function saveChatSession(sessionId: string, sessionData: ChatSession, env: Env): Promise<void> {
  try {
    await env.ANNA_LAURA_BASIC.put(
      sessionId,
      JSON.stringify(sessionData),
      { expirationTtl: 86400 }
    );
  } catch (e) {
    console.error("Error saving session:", e);
  }
}

/* ============================================================
   NEWS API (Everything + Top Headlines)
============================================================ */

async function fetchNews(query: string, env: Env) {
  const apiKey = env.LAURANEWS_API_KEY;

  const everythingURL =
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=id&sortBy=publishedAt&pageSize=6&apiKey=${apiKey}`;

  const headlinesURL =
    `https://newsapi.org/v2/top-headlines?country=id&pageSize=6&apiKey=${apiKey}`;

  const [everything, headlines] = await Promise.all([
    fetch(everythingURL).then(r => r.json()),
    fetch(headlinesURL).then(r => r.json())
  ]);

  const articles = [...(headlines.articles || []), ...(everything.articles || [])];

  return formatNewsUltraRapi(articles);
}

// Format Ultra-Rapi (pilihan kamu)
function formatNewsUltraRapi(articles: any[]) {
  if (!articles.length) {
    return "💡 Laura tidak menemukan berita untuk topik tersebut.";
  }

  let result = "📰 **Berita Terbaru untuk Kamu**\n\n";

  articles.slice(0, 10).forEach((a, i) => {
    result += `${i + 1}. **${a.title}**\n`;
    if (a.description) result += `   - **Ringkasan:** ${a.description}\n`;
    if (a.source?.name) result += `   - **Sumber:** ${a.source.name}\n`;
    if (a.url) result += `   - **Link:** ${a.url}\n`;
    result += `\n`;
  });

  return result;
}

/* ============================================================
   HANDLE NEWS REQUEST
============================================================ */
async function handleNewsRequest(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { query } = await request.json();

    if (!query || query.trim() === "") {
      return new Response(JSON.stringify({ error: "Query kosong." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await fetchNews(query, env);

    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Gagal memproses request berita." }), {
      status: 500
    });
  }
}

/* ============================================================
   HANDLE CHAT REQUEST
============================================================ */
async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  try {
    const { messages = [], sessionId: clientSessionId } = await request.json();

    const sessionId = clientSessionId || generateSessionId();

    let sessionData = await loadChatSession(sessionId, env) || {
      chatHistory: [],
      sessionStart: Date.now(),
      messageCount: 0,
      lastActivity: Date.now(),
      sessionId
    };

    if (!checkRateLimit(sessionData)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded.", sessionId }),
        { status: 429 }
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role === "user" && !contentFilter(lastUserMessage.content)) {
      return new Response(
        JSON.stringify({ error: "Content not allowed.", sessionId }),
        { status: 400 }
      );
    }

    const allMessages = [...sessionData.chatHistory, ...messages];

    if (!allMessages.some(msg => msg.role === "system")) {
      allMessages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const processedMessages = allMessages.map(msg => {
      if (msg.role === "assistant") {
        return { ...msg, content: msg.content.replace(/saya|aku/gi, "Laura") };
      }
      return msg;
    });

    // AI Streaming
    const aiResponse = await env.AI.run(MODEL_ID, {
      messages: processedMessages,
      max_tokens: 2048,
      stream: true
    });

    sessionData.chatHistory = allMessages.slice(-50);
    sessionData.messageCount++;
    sessionData.lastActivity = Date.now();

    await saveChatSession(sessionId, sessionData, env);

    const originalStream = aiResponse as ReadableStream;
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = originalStream.getReader();
        const encoder = new TextEncoder();

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.response) {
                    const lauraText = data.response.replace(/saya|aku/gi, "Laura");
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ response: lauraText })}\n\n`)
                    );
                  }
                } catch {}
              }
            }
          }
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ response: "Laura mengalami gangguan." })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });

  } catch (err) {
    console.error("Chat error:", err);
    return new Response(
      JSON.stringify({ error: "Laura mengalami gangguan teknis." }),
      { status: 500 }
    );
  }
}
