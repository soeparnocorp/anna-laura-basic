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

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Content filter untuk mencegah spam dan explicit content
 */
function contentFilter(message: string): boolean {
  return !SPAM_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Generate session ID untuk anonymous user
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Rate limiting check
 */
function checkRateLimit(sessionData: any): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Max 10 messages per minute
  if (sessionData.lastActivity > oneMinuteAgo && sessionData.messageCount > 10) {
    return false;
  }
  
  // Max 1000 messages per session (1MB limit)
  if (sessionData.messageCount > 1000) {
    return false;
  }
  
  return true;
}

/**
 * Load chat session dari R2
 */
async function loadChatSession(sessionId: string, env: Env): Promise<ChatSession | null> {
  try {
    const sessionData = await env.ANNA_LAURA_BASIC.get(sessionId);
    if (sessionData) {
      return JSON.parse(await sessionData.text());
    }
  } catch (error) {
    console.error("Error loading session:", error);
  }
  return null;
}

/**
 * Save chat session ke R2
 */
async function saveChatSession(sessionId: string, sessionData: ChatSession, env: Env): Promise<void> {
  try {
    await env.ANNA_LAURA_BASIC.put(
      sessionId,
      JSON.stringify(sessionData),
      { expirationTtl: 86400 } // 24 jam
    );
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { messages = [], sessionId: clientSessionId } = await request.json() as {
      messages: ChatMessage[];
      sessionId?: string;
    };

    // Generate atau gunakan session ID
    const sessionId = clientSessionId || generateSessionId();
    
    // Load existing session atau create baru
    let sessionData = await loadChatSession(sessionId, env) || {
      chatHistory: [],
      sessionStart: Date.now(),
      messageCount: 0,
      lastActivity: Date.now(),
      sessionId: sessionId
    };

    // Check rate limiting
    if (!checkRateLimit(sessionData)) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          sessionId 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter spam content
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role === 'user' && !contentFilter(lastUserMessage.content)) {
      return new Response(
        JSON.stringify({ 
          error: "Content not allowed.",
          sessionId 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Combine session history dengan new messages
    const allMessages = [...sessionData.chatHistory, ...messages];
    
    // Add system prompt jika belum ada
    if (!allMessages.some((msg) => msg.role === "system")) {
      allMessages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Process messages untuk Laura persona
    const processedMessages = allMessages.map(msg => {
      if (msg.role === "assistant") {
        return {
          ...msg,
          content: msg.content.replace(/saya|aku/gi, 'Laura')
        };
      }
      return msg;
    });

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages: processedMessages,
        max_tokens: 2048,
        stream: true
      }
    );

    // Update session data
    sessionData.chatHistory = allMessages.slice(-50); // Keep last 50 messages
    sessionData.messageCount += 1;
    sessionData.lastActivity = Date.now();

    // Save session ke R2
    await saveChatSession(sessionId, sessionData, env);

    // Return streaming response dengan session ID
    const originalStream = response as ReadableStream;
    const transformedStream = new ReadableStream({
      async start(controller) {
        const reader = originalStream.getReader();
        const encoder = new TextEncoder();
        
        // Send session ID first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.response) {
                    const lauraResponse = data.response.replace(/saya|aku/gi, 'Laura');
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: lauraResponse })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMsg = JSON.stringify({
            response: "Laura minta maaf, terjadi gangguan pada sistem."
          });
          controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error processing chat request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Maaf, Laura mengalami gangguan teknis. Silakan coba lagi dalam beberapa saat."
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
