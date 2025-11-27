/**
 * Anna Laura AI Assistant - GROK + Workers AI Fallback
 * Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp.
 */

import { Env, ChatMessage, ChatSession } from "./types";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM_PROMPT = `Anda adalah Anna Laura AI, asisten AI cerdas yang ramah dan membantu. 
Selalu gunakan kata "Laura" ketika merujuk pada diri sendiri, bukan "saya" atau "aku".`;

const SPAM_PATTERNS = [
  /porn/i, /xxx/i, /adult/i, /sex/i, /nude/i, /fuck/i, /shit/i,
  /http(s)?:\/\//, /www\./i, /\.com/i, /bit\.ly/i, /spam/i
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChatRequest(request, env);
    }

    if (url.pathname === "/api/news" && request.method === "POST") {
      return handleNewsRequest(request);
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/* ============================================================
   FILTER & UTILITIES (sama persis kayak punya lo)
============================================================ */
function contentFilter(message: string): boolean {
  return !SPAM_PATTERNS.some(pattern => pattern.test(message));
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function checkRateLimit(sessionData: any): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  if (sessionData.lastActivity > oneMinuteAgo && sessionData.messageCount > 10) return false;
  if (sessionData.messageCount > 1000) return false;
  return true;
}

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
   NEWS & CHAT HANDLER (tetap sama)
============================================================ */
async function fetchNews(query: string) { /* kode lo sama persis */ }
async function handleNewsRequest(request: Request): Promise<Response> { /* kode lo sama persis */ }

/* ============================================================
   CHAT HANDLER – VERSI BARU: GROK DULUAN, FALLBACK LLAMA
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
      return new Response(JSON.stringify({ error: "Rate limit exceeded.", sessionId }), { status: 429 });
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role === "user" && !contentFilter(lastUserMessage.content)) {
      return new Response(JSON.stringify({ error: "Content not allowed.", sessionId }), { status: 400 });
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

    // ========== PRIORITAS 1: GROK (kalau secret ada) ==========
    if (env.LAURAGROK_API_KEY) {
      try {
        const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.LAURAGROK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-beta",
            messages: processedMessages,
            temperature: 0.7,
            max_tokens: 2048,
            stream: true,
          }),
        });

        if (grokResponse.ok && grokResponse.body) {
          const stream = grokResponse.body.pipeThrough(new TransformStream({
            transform(chunk, controller) {
              const text = new TextDecoder().decode(chunk);
              const lines = text.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                  try {
                    const json = JSON.parse(line.slice(6));
                    if (json.choices?.[0]?.delta?.content) {
                      const lauraText = json.choices[0].delta.content.replace(/saya|aku/gi, "Laura");
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ response: lauraText })}\n\n`));
                    }
                  } catch {}
                }
              }
            }
          }));

          // Kirim sessionId dulu
          const finalStream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ sessionId })}\n\n`));
              stream.pipeTo(new WritableStream({
                write(chunk) { controller.enqueue(chunk); },
                close() { controller.close(); }
              }));
            }
          });

          sessionData.chatHistory = allMessages.slice(-50).concat({ role: "assistant", content: "[Grok]" });
          sessionData.messageCount++;
          sessionData.lastActivity = Date.now();
          await saveChatSession(sessionId, sessionData, env);

          return new Response(finalStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            }
          });
        }
      } catch (e) {
        console.log("Grok gagal, fallback ke Workers AI");
      }
    }

    // ========== FALLBACK: Workers AI (kode lo yang lama) ==========
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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: lauraText })}\n\n`));
                }
              } catch {}
            }
          }
        }
        controller.close();
      }
    });

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (err) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ error: "Laura mengalami gangguan teknis." }), { status: 500 });
  }
}
