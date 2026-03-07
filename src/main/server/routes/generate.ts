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
  personas,
  chatCharacters,
} from "../../db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { wordCount, substituteVars, buildSystemMessage } from "../lib/chat-utils";
import {
  buildProviderUrl,
  buildProviderHeaders,
  buildProviderRequestBody,
  parseStreamLine,
  type ProviderMessage,
  type ProviderPreset,
} from "../lib/providers";
import type { ProviderType } from "../../../shared/types";

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
    (sum, m) => sum + wordCount(m.content || ""),
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

export async function generateRoutes(app: FastifyInstance) {
  app.post<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/generate",
    async (request, reply) => {
      const { chatId } = request.params;
      const body = (request.body as Record<string, unknown>) || {};
      const mode = (body.mode as string) || "in_character";
      const requestedCharacterId = (body.characterId as string) || null;

      console.log(`[generate] === Request received for chat=${chatId} mode=${mode} origin=${request.headers.origin} ===`);

      // Tell Fastify we're taking over the raw response
      reply.hijack();

      // Set SSE headers
      const origin = request.headers.origin || "*";
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      });

      // Track client disconnection via the underlying socket
      let clientDisconnected = false;
      const abortController = new AbortController();
      reply.raw.on("close", () => {
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

        // Load all characters in this chat (for group chat support)
        const groupMembers = db
          .select({
            id: characters.id,
            name: characters.name,
            position: chatCharacters.position,
          })
          .from(chatCharacters)
          .leftJoin(characters, eq(chatCharacters.characterId, characters.id))
          .where(eq(chatCharacters.chatId, chatId))
          .orderBy(asc(chatCharacters.position))
          .all();

        // Determine which character is speaking: use requestedCharacterId if valid, else primary
        const speakingCharId = (requestedCharacterId && groupMembers.some(m => m.id === requestedCharacterId))
          ? requestedCharacterId
          : chat.characterId;

        // Load character
        const char = db
          .select()
          .from(characters)
          .where(eq(characters.id, speakingCharId))
          .get();
        if (!char) {
          sendSSE("error", { error: "Character not found" });
          reply.raw.end();
          return;
        }

        const isGroupChat = groupMembers.length > 1;
        // Names of other participants (for group preamble)
        const otherParticipantNames = groupMembers
          .filter(m => m.id !== speakingCharId)
          .map(m => m.name ?? "Unknown");
        // Build a quick name lookup for history prefixing
        const charNameById = new Map(groupMembers.map(m => [m.id!, m.name ?? "Unknown"]));

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

        // Resolve persona/user name
        const userName = chat.personaName || "User";
        const charName = char.name;
        const sub = (text: string) => substituteVars(text, charName, userName);

        // Build provider messages array
        const providerMessages: ProviderMessage[] = [];

        // System message
        providerMessages.push({
          role: "system",
          content: sub(buildSystemMessage(char)),
        });

        // Group chat preamble
        if (isGroupChat && otherParticipantNames.length > 0) {
          providerMessages.push({
            role: "system",
            content: [
              `This is a group roleplay. You are ONLY ${charName}. You must NEVER speak as, act as, or write the actions/thoughts of any other character.`,
              `Other participants present: ${otherParticipantNames.join(", ")}. Their messages appear prefixed with [Name]: in the chat history — these are for context only.`,
              `IMPORTANT: Do NOT use the physical appearance, mannerisms, speech patterns, or traits of ${otherParticipantNames.join(" or ")}. Stay strictly within ${charName}'s established character.`,
              `The scene is already in progress. You are already present. Do NOT re-introduce yourself or greet as if the scene is just beginning — respond naturally to what has already happened.`,
            ].join("\n"),
          });
        }

        // Persona context
        if (chat.personaName) {
          const persona = db
            .select()
            .from(personas)
            .where(eq(personas.name, chat.personaName))
            .get();
          if (persona?.description) {
            providerMessages.push({
              role: "system",
              content: sub(`[${userName}'s persona: ${persona.description}]`),
            });
          }
        }

        // Example dialogues
        if (char.exampleDialogues) {
          try {
            const examples = JSON.parse(char.exampleDialogues) as string[];
            if (examples.length > 0) {
              providerMessages.push({
                role: "system",
                content: sub("[Example Chat]\n" + examples.join("\n")),
              });
            }
          } catch {
            // ignore parse errors
          }
        }

        // Post-history instructions will be injected after messages
        const postInstructions = char.postHistoryInstructions;

        // Chat history — in group chats, prefix assistant messages from other characters
        const historyMessages: ProviderMessage[] = chatMessages.map((m) => {
          let content = sub(m.content || "");
          if (isGroupChat && m.role === "assistant" && m.characterId && m.characterId !== speakingCharId) {
            const otherName = charNameById.get(m.characterId) ?? "Unknown";
            content = `[${otherName}]: ${content}`;
          }
          return {
            role: (m.role === "system" ? "system" : m.role) as ProviderMessage["role"],
            content,
          };
        });

        // Inject scene direction at configured depth
        if (scene && scene.enabled && scene.text) {
          const depth = scene.injectionDepth ?? 4;
          const insertIdx = Math.max(0, historyMessages.length - depth);
          historyMessages.splice(insertIdx, 0, {
            role: "system",
            content: sub(`[Scene Direction: ${scene.text}]`),
          });
        }

        // Inject post-history instructions near the end
        if (postInstructions) {
          historyMessages.push({
            role: "system",
            content: sub(postInstructions),
          });
        }

        providerMessages.push(...historyMessages);

        // Continue mode nudge
        if (mode === "continue") {
          providerMessages.push({
            role: "system",
            content: "[Continue your last message without repeating its original content.]",
          });
        }

        // Final identity anchor for group chats — highest recency, prevents trait bleed
        if (isGroupChat) {
          providerMessages.push({
            role: "system",
            content: `Remember: you are ${charName}. Write only ${charName}'s response now. Do not include dialogue or actions for ${otherParticipantNames.join(", ")}.`,
          });
        }

        // Build preset params for the provider adapter
        let presetParams: ProviderPreset | null = null;
        if (preset) {
          let stops: string[] = [];
          try { stops = JSON.parse(preset.stopSequences || "[]") as string[]; } catch { /**/ }
          presetParams = {
            temperature: preset.temperature,
            topP: preset.topP,
            topPEnabled: Boolean(preset.topPEnabled),
            topK: preset.topK,
            topKEnabled: Boolean(preset.topKEnabled),
            repetitionPenalty: preset.repetitionPenalty,
            maxNewTokens: preset.maxNewTokens,
            stopSequences: stops,
          };
        }

        // Dispatch to the correct provider
        const providerType = (connection.type as ProviderType) || "ollama";
        const startTime = Date.now();
        const timeoutSignal = AbortSignal.timeout(120_000);
        const combinedSignal = AbortSignal.any([abortController.signal, timeoutSignal]);

        const providerRes = await fetch(buildProviderUrl(providerType, connection.endpoint), {
          method: "POST",
          headers: buildProviderHeaders(providerType, connection.apiKey ?? null),
          body: JSON.stringify(
            buildProviderRequestBody(providerType, chat.modelId, providerMessages, presetParams)
          ),
          signal: combinedSignal,
        });

        if (!providerRes.ok) {
          const errText = await providerRes.text().catch(() => "Unknown error");
          console.error(`[generate] Provider (${providerType}) returned ${providerRes.status}: ${errText}`);
          sendSSE("error", { error: `Provider error ${providerRes.status}: ${errText}` });
          reply.raw.end();
          return;
        }

        // Stream response as SSE to client
        let fullContent = "";
        const reader = providerRes.body?.getReader();
        if (!reader) {
          sendSSE("error", { error: "No response stream from provider" });
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
            const parsed = parseStreamLine(providerType, line);
            if (!parsed) continue;
            if (parsed.text) {
              fullContent += parsed.text;
              sendSSE("token", { content: parsed.text });
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const parsed = parseStreamLine(providerType, buffer);
          if (parsed?.text) {
            fullContent += parsed.text;
            sendSSE("token", { content: parsed.text });
          }
        }

        if (!fullContent) {
          console.error(`[generate] Stream ended without producing any tokens (chat=${chatId}, model=${chat.modelId}, provider=${providerType})`);
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
          characterId: speakingCharId,
        };

        db.insert(messages).values(record).run();
        updateChatCounts(chatId);

        console.log(`[generate] === Sending done event, content length=${fullContent.length} ===`);

        sendSSE("done", {
          message: {
            ...record,
            isSystemMessage: false,
            bookmark: null,
          },
        });

        reply.raw.end();
      } catch (err) {
        // Client disconnected — don't save, just clean up
        if ((err as Error).name === "AbortError" && clientDisconnected) {
          try { reply.raw.end(); } catch { /* already closed */ }
          return reply;
        }

        // Timeout (AbortSignal.timeout fires TimeoutError)
        const isTimeout = (err as Error).name === "TimeoutError" ||
          ((err as Error).name === "AbortError" && !clientDisconnected);
        const errorMsg = isTimeout
          ? "Generation timed out — the provider may be slow or unresponsive. Try again."
          : err instanceof Error ? err.message : "Generation failed";

        console.error(`[generate] ${errorMsg}`, err);
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
