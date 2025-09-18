import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import {
  chats,
  characters,
  messages,
  sceneDirections,
  generationPresets,
  connectionProfiles,
  bookmarks,
} from "../../db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

function updateChatCounts(chatId: string) {
  const msgRows = db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .all();

  const bmCount = db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.chatId, chatId))
    .get();

  const lastMsg = db
    .select({ timestamp: messages.timestamp })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.timestamp))
    .limit(1)
    .get();

  const totalWords = msgRows.reduce(
    (sum, m) => sum + (m.content?.trim() ? m.content.trim().split(/\s+/).length : 0),
    0
  );

  db.update(chats)
    .set({
      messageCount: msgRows.length,
      wordCount: totalWords,
      bookmarkCount: bmCount?.count || 0,
      lastMessageAt: lastMsg?.timestamp || null,
    })
    .where(eq(chats.id, chatId))
    .run();
}

function buildSystemMessage(char: {
  systemPrompt: string | null;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  name: string;
}): string {
  if (char.systemPrompt) return char.systemPrompt;

  const parts: string[] = [];
  if (char.description) parts.push(char.description);
  if (char.personality) parts.push(`Personality: ${char.personality}`);
  if (char.scenario) parts.push(`Scenario: ${char.scenario}`);

  return parts.length > 0
    ? parts.join("\n\n")
    : `You are ${char.name}. Stay in character and respond naturally.`;
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateRoutes(app: FastifyInstance) {
  app.post<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/generate",
    async (request, reply) => {
      const { chatId } = request.params;
      const body = (request.body as Record<string, unknown>) || {};
      const mode = (body.mode as string) || "in_character";

      // Set SSE headers (CORS must be manual since we bypass Fastify's reply)
      const origin = request.headers.origin || "*";
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      });

      // Track client disconnection
      let clientDisconnected = false;
      const abortController = new AbortController();
      request.raw.on("close", () => {
        clientDisconnected = true;
        abortController.abort();
      });

      function sendSSE(event: string, data: unknown) {
        if (!clientDisconnected) {
          reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
      }

      try {
        // Load chat
        const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
        if (!chat) {
          sendSSE("error", { error: "Chat not found" });
          reply.raw.end();
          return;
        }

        // Load character
        const char = db
          .select()
          .from(characters)
          .where(eq(characters.id, chat.characterId))
          .get();
        if (!char) {
          sendSSE("error", { error: "Character not found" });
          reply.raw.end();
          return;
        }

        // Load active connection
        const connection = db
          .select()
          .from(connectionProfiles)
          .where(eq(connectionProfiles.isActive, 1))
          .get();
        if (!connection) {
          sendSSE("error", { error: "No active connection profile" });
          reply.raw.end();
          return;
        }

        // Load messages
        const chatMessages = db
          .select()
          .from(messages)
          .where(eq(messages.chatId, chatId))
          .orderBy(asc(messages.timestamp))
          .all();

        // Load scene direction
        const scene = db
          .select()
          .from(sceneDirections)
          .where(eq(sceneDirections.chatId, chatId))
          .get();

        // Load first preset as active
        const preset = db.select().from(generationPresets).limit(1).get();

        // Build Ollama messages array
        const ollamaMessages: OllamaChatMessage[] = [];

        // System message
        ollamaMessages.push({
          role: "system",
          content: buildSystemMessage(char),
        });

        // Example dialogues
        if (char.exampleDialogues) {
          try {
            const examples = JSON.parse(char.exampleDialogues) as string[];
            if (examples.length > 0) {
              ollamaMessages.push({
                role: "system",
                content: "Example dialogue:\n" + examples.join("\n"),
              });
            }
          } catch {
            // ignore parse errors
          }
        }

        // Post-history instructions will be injected after messages
        const postInstructions = char.postHistoryInstructions;

        // Chat history
        const historyMessages: OllamaChatMessage[] = chatMessages.map((m) => ({
          role: (m.role === "system" ? "system" : m.role) as OllamaChatMessage["role"],
          content: m.content || "",
        }));

        // Inject scene direction at configured depth
        if (scene && scene.enabled && scene.text) {
          const depth = scene.injectionDepth ?? 4;
          const insertIdx = Math.max(0, historyMessages.length - depth);
          historyMessages.splice(insertIdx, 0, {
            role: "system",
            content: `[Scene Direction: ${scene.text}]`,
          });
        }

        // Inject post-history instructions near the end
        if (postInstructions) {
          historyMessages.push({
            role: "system",
            content: postInstructions,
          });
        }

        ollamaMessages.push(...historyMessages);

        // Build Ollama options from preset
        const options: Record<string, unknown> = {};
        if (preset) {
          options.temperature = preset.temperature;
          if (preset.topPEnabled) options.top_p = preset.topP;
          if (preset.topKEnabled) options.top_k = preset.topK;
          options.repeat_penalty = preset.repetitionPenalty;
          options.num_predict = preset.maxNewTokens;
          try {
            const stops = JSON.parse(preset.stopSequences || "[]") as string[];
            if (stops.length > 0) options.stop = stops;
          } catch {
            // ignore
          }
        }

        // Call Ollama
        const startTime = Date.now();
        const ollamaRes = await fetch(`${connection.endpoint}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: chat.modelId,
            messages: ollamaMessages,
            stream: true,
            options,
          }),
          signal: abortController.signal,
        });

        if (!ollamaRes.ok) {
          const errText = await ollamaRes.text().catch(() => "Unknown error");
          sendSSE("error", { error: `Ollama error ${ollamaRes.status}: ${errText}` });
          reply.raw.end();
          return;
        }

        // Stream NDJSON from Ollama as SSE to client
        let fullContent = "";
        const reader = ollamaRes.body?.getReader();
        if (!reader) {
          sendSSE("error", { error: "No response stream from Ollama" });
          reply.raw.end();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line) as {
                message?: { content?: string };
                done?: boolean;
              };

              if (chunk.message?.content) {
                fullContent += chunk.message.content;
                sendSSE("token", { content: chunk.message.content });
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer) as {
              message?: { content?: string };
              done?: boolean;
            };
            if (chunk.message?.content) {
              fullContent += chunk.message.content;
              sendSSE("token", { content: chunk.message.content });
            }
          } catch {
            // ignore
          }
        }

        // Only save to DB if client is still connected
        if (clientDisconnected) {
          reply.raw.end();
          return reply;
        }

        const generationTimeMs = Date.now() - startTime;
        const tokenCount = Math.ceil(fullContent.length / 4);

        const now = new Date().toISOString();
        const id = generateId();
        const record = {
          id,
          chatId,
          role: "assistant",
          content: fullContent,
          timestamp: now,
          tokenCount,
          isSystemMessage: 0,
          model: chat.modelId,
          generationTimeMs,
          swipeIndex: null,
          swipeCount: null,
        };

        db.insert(messages).values(record).run();
        updateChatCounts(chatId);

        sendSSE("done", {
          message: {
            ...record,
            isSystemMessage: false,
            bookmark: null,
          },
        });

        reply.raw.end();
      } catch (err) {
        // AbortError means client disconnected — don't save, just clean up
        if ((err as Error).name === "AbortError" || clientDisconnected) {
          try { reply.raw.end(); } catch { /* already closed */ }
          return reply;
        }
        const errorMsg = err instanceof Error ? err.message : "Generation failed";
        try {
          sendSSE("error", { error: errorMsg });
        } catch {
          // reply may already be closed
        }
        reply.raw.end();
      }

      // Prevent Fastify from trying to send a response
      return reply;
    }
  );
}
