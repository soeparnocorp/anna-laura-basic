/**
 * Anna Laura AI Assistant
 * 
 * Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp.
 * Beroperasi dari Sukabumi City, West Java - INDONESIA
 * 
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
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

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests untuk Anna Laura AI
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // Process messages to ensure Laura's persona
    const processedMessages = messages.map(msg => {
      if (msg.role === "assistant") {
        // Ensure assistant responses use Laura persona
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

    // Return streaming response
    return new Response(response as ReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error processing chat request:", error);
    
    // Error response in Laura's persona
    const errorMessage = JSON.stringify({
      response: "Maaf, Laura mengalami gangguan teknis. Silakan coba lagi dalam beberapa saat."
    });
    
    return new Response(`data: ${errorMessage}\n\n`, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

/**
 * Utility function to stream responses
 */
function createStreamingResponse(messages: ChatMessage[], env: Env): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await env.AI.run(
          MODEL_ID,
          {
            messages,
            max_tokens: 2048,
            stream: true
          }
        );

        const reader = (response as ReadableStream).getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Process and send each chunk
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.response) {
                  // Ensure Laura persona in streaming
                  const lauraResponse = data.response.replace(/saya|aku/gi, 'Laura');
                  controller.enqueue(`data: ${JSON.stringify({ response: lauraResponse })}\n\n`);
                }
              } catch (e) {
                // Skip invalid JSON in streaming
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
        controller.enqueue(`data: ${errorMsg}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
