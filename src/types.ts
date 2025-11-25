/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
  /**
   * Binding for the Workers AI API.
   */
  AI: Ai;

  /**
   * Binding for static assets.
   */
  ASSETS: { fetch: (request: Request) => Promise<Response> };

  /**
   * Binding for chat memory storage in R2.
   */
  ANNA_LAURA_BASIC: R2Bucket;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Represents a chat session stored in R2.
 */
export interface ChatSession {
  chatHistory: ChatMessage[];
  sessionStart: number;
  messageCount: number;
  lastActivity: number;
  sessionId: string;
}
