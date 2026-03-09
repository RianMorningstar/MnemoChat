import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: () => "/tmp/test-mnemochat-vm",
  },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

// Deterministic vectors for known similarity relationships:
// "dragon"       → [1, 0, 0]       (baseline)
// "castle"       → [0, 1, 0]       (orthogonal — dissimilar)
// "dragon attack" → [0.9, 0.1, 0]  (very similar to dragon)
// "hello world"  → [0.1, 0.1, 0.9] (dissimilar to both)
// query "dragon fire" → [0.95, 0.05, 0] (most similar to dragon, then dragon attack)

let embedCallCount = 0;
const CONTENT_VECTORS: Record<string, number[]> = {
  "[user] Tell me about dragons.": [1, 0, 0],
  "[assistant] Dragons are mighty creatures.": [0.9, 0.1, 0],
  "[user] What about castles?": [0, 1, 0],
  "[assistant] Castles are fortified structures.": [0.1, 0.9, 0],
  "[user] Hello world.": [0.1, 0.1, 0.9],
};
const DEFAULT_VEC = [0.3, 0.3, 0.3];

vi.mock("../../src/main/server/lib/embedding-providers", () => ({
  getEmbedding: vi.fn(async (text: string) => {
    embedCallCount++;
    return CONTENT_VECTORS[text] || DEFAULT_VEC;
  }),
  getBatchEmbeddings: vi.fn(async (texts: string[]) => {
    return texts.map((t) => {
      embedCallCount++;
      return CONTENT_VECTORS[t] || DEFAULT_VEC;
    });
  }),
}));

import Fastify, { type FastifyInstance } from "fastify";
import { vectorMemoryRoutes } from "../../src/main/server/routes/vector-memory";
import { messageRoutes } from "../../src/main/server/routes/messages";
import { characterRoutes } from "../../src/main/server/routes/characters";
import { chatRoutes } from "../../src/main/server/routes/chats";
import { db } from "../../src/main/db";
import { characters, chats, messages, appSettings, messageEmbeddings } from "../../src/main/db/schema";
import { eq } from "drizzle-orm";
import { getEmbedding } from "../../src/main/server/lib/embedding-providers";

describe("vector-memory routes", () => {
  let app: FastifyInstance;
  let characterId: string;
  let chatId: string;
  const messageIds: string[] = [];

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await chatRoutes(app);
    await messageRoutes(app);
    await vectorMemoryRoutes(app);
    await app.ready();

    // Seed character
    characterId = crypto.randomUUID();
    db.insert(characters)
      .values({ id: characterId, name: "VM Test Char", createdAt: new Date().toISOString() })
      .run();

    // Seed chat
    chatId = crypto.randomUUID();
    db.insert(chats)
      .values({
        id: chatId,
        characterId,
        modelId: "llama3",
        modelName: "LLaMA 3",
        createdAt: new Date().toISOString(),
      })
      .run();

    // Seed messages with parent chain (branching-aware)
    const seedMessages = [
      { role: "user", content: "Tell me about dragons." },
      { role: "assistant", content: "Dragons are mighty creatures." },
      { role: "user", content: "What about castles?" },
      { role: "assistant", content: "Castles are fortified structures." },
      { role: "user", content: "Hello world." },
    ];

    let parentId: string | null = null;
    for (const m of seedMessages) {
      const id = crypto.randomUUID();
      messageIds.push(id);
      db.insert(messages)
        .values({
          id,
          chatId,
          role: m.role,
          content: m.content,
          timestamp: new Date().toISOString(),
          parentId,
          branchPosition: 0,
        })
        .run();
      parentId = id;
    }

    // Set activeLeafId to the last message
    db.update(chats)
      .set({ activeLeafId: messageIds[messageIds.length - 1] })
      .where(eq(chats.id, chatId))
      .run();

    // Seed app settings
    const now = new Date().toISOString();
    const settings = [
      ["vector_memory_enabled", "true"],
      ["vector_memory_provider", "local"],
      ["vector_memory_model", "test-model"],
      ["vector_memory_score_threshold", "0.1"],
    ];
    for (const [key, value] of settings) {
      db.insert(appSettings).values({ key, value, updatedAt: now }).run();
    }

    embedCallCount = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── GET /api/vector-memory/models ───────────────────

  describe("GET /api/vector-memory/models", () => {
    it("returns model lists for all providers", async () => {
      const res = await app.inject({ method: "GET", url: "/api/vector-memory/models" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.local).toBeInstanceOf(Array);
      expect(body.ollama).toBeInstanceOf(Array);
      expect(body.openai).toBeInstanceOf(Array);
      expect(body.local.length).toBeGreaterThan(0);
    });
  });

  // ── GET /api/chats/:chatId/vector-memory/status ─────

  describe("GET /api/chats/:chatId/vector-memory/status", () => {
    it("returns 0 embedded for a fresh chat", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/chats/${chatId}/vector-memory/status`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.chatId).toBe(chatId);
      expect(body.totalMessages).toBe(5);
      expect(body.embeddedMessages).toBe(0);
      expect(body.embeddingModel).toBe("test-model");
    });
  });

  // ── POST /api/chats/:chatId/vector-memory/embed-all ─

  describe("POST /api/chats/:chatId/vector-memory/embed-all", () => {
    it("embeds all messages and returns count", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/embed-all`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.embedded).toBe(5);
    });

    it("status shows all messages embedded after embed-all", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/chats/${chatId}/vector-memory/status`,
      });
      const body = res.json();
      expect(body.embeddedMessages).toBe(5);
      expect(body.totalMessages).toBe(5);
      expect(body.lastEmbeddedAt).toBeTruthy();
    });

    it("re-running embed-all returns 0 (already embedded)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/embed-all`,
      });
      expect(res.json().embedded).toBe(0);
    });

    it("returns 0 for nonexistent chat", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chats/nonexistent-id/vector-memory/embed-all",
      });
      expect(res.json().embedded).toBe(0);
    });
  });

  // ── POST /api/chats/:chatId/vector-memory/search ────

  describe("POST /api/chats/:chatId/vector-memory/search", () => {
    it("returns results sorted by score descending", async () => {
      // Query "dragon fire" vector is most similar to the dragon messages
      const res = await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/search`,
        payload: { query: "dragon fire", topK: 5 },
      });
      expect(res.statusCode).toBe(200);
      const results = res.json();
      expect(results.length).toBeGreaterThan(0);

      // Verify descending score order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("each result has messageId, content, role, score, timestamp", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/search`,
        payload: { query: "test query", topK: 1 },
      });
      const results = res.json();
      expect(results.length).toBeGreaterThanOrEqual(1);
      const r = results[0];
      expect(typeof r.messageId).toBe("string");
      expect(typeof r.content).toBe("string");
      expect(typeof r.role).toBe("string");
      expect(typeof r.score).toBe("number");
      expect(typeof r.timestamp).toBe("string");
    });

    it("returns empty array for nonexistent chat", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/chats/nonexistent-id/vector-memory/search",
        payload: { query: "test", topK: 5 },
      });
      expect(res.json()).toEqual([]);
    });

    it("respects topK parameter", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/search`,
        payload: { query: "test", topK: 2 },
      });
      expect(res.json().length).toBeLessThanOrEqual(2);
    });
  });

  // ── DELETE /api/chats/:chatId/vector-memory ─────────

  describe("DELETE /api/chats/:chatId/vector-memory", () => {
    it("clears all embeddings for the chat", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/chats/${chatId}/vector-memory`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
    });

    it("status shows 0 after clearing", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/chats/${chatId}/vector-memory/status`,
      });
      expect(res.json().embeddedMessages).toBe(0);
    });

    it("does not affect other chats", async () => {
      // Re-embed the main chat
      await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/embed-all`,
      });

      // Create a second chat with a message
      const chatId2 = crypto.randomUUID();
      db.insert(chats)
        .values({
          id: chatId2,
          characterId,
          modelId: "llama3",
          modelName: "LLaMA 3",
          createdAt: new Date().toISOString(),
        })
        .run();
      const msgId2 = crypto.randomUUID();
      db.insert(messages)
        .values({
          id: msgId2,
          chatId: chatId2,
          role: "user",
          content: "Other chat message",
          timestamp: new Date().toISOString(),
        })
        .run();
      db.update(chats).set({ activeLeafId: msgId2 }).where(eq(chats.id, chatId2)).run();

      // Embed chat2
      await app.inject({
        method: "POST",
        url: `/api/chats/${chatId2}/vector-memory/embed-all`,
      });

      // Delete chat1 embeddings
      await app.inject({
        method: "DELETE",
        url: `/api/chats/${chatId}/vector-memory`,
      });

      // Chat2 embeddings should still exist
      const statusRes = await app.inject({
        method: "GET",
        url: `/api/chats/${chatId2}/vector-memory/status`,
      });
      expect(statusRes.json().embeddedMessages).toBe(1);
    });
  });

  // ── Message lifecycle: edit/delete clears embeddings ─

  describe("message lifecycle hooks", () => {
    it("editing a message clears its embeddings", async () => {
      // Re-embed
      await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/embed-all`,
      });

      // Verify the first message has embeddings
      const before = db
        .select()
        .from(messageEmbeddings)
        .where(eq(messageEmbeddings.messageId, messageIds[0]))
        .all();
      expect(before.length).toBeGreaterThan(0);

      // Edit the message
      const editRes = await app.inject({
        method: "PUT",
        url: `/api/messages/${messageIds[0]}`,
        payload: { content: "Edited content about dragons" },
      });
      expect(editRes.json().ok).toBe(true);

      // Embeddings should be cleared
      const after = db
        .select()
        .from(messageEmbeddings)
        .where(eq(messageEmbeddings.messageId, messageIds[0]))
        .all();
      expect(after.length).toBe(0);
    });

    it("deleting a message clears its embeddings", async () => {
      // Create a new message to delete
      const delMsgId = crypto.randomUUID();
      const parentMsg = messageIds[messageIds.length - 1];
      db.insert(messages)
        .values({
          id: delMsgId,
          chatId,
          role: "user",
          content: "I will be deleted.",
          timestamp: new Date().toISOString(),
          parentId: parentMsg,
          branchPosition: 1,
        })
        .run();

      // Embed it
      db.update(chats).set({ activeLeafId: delMsgId }).where(eq(chats.id, chatId)).run();
      await app.inject({
        method: "POST",
        url: `/api/chats/${chatId}/vector-memory/embed-all`,
      });

      // Verify embedding exists
      const before = db
        .select()
        .from(messageEmbeddings)
        .where(eq(messageEmbeddings.messageId, delMsgId))
        .all();
      expect(before.length).toBeGreaterThan(0);

      // Delete the message
      await app.inject({
        method: "DELETE",
        url: `/api/messages/${delMsgId}`,
      });

      // Embeddings should be gone
      const after = db
        .select()
        .from(messageEmbeddings)
        .where(eq(messageEmbeddings.messageId, delMsgId))
        .all();
      expect(after.length).toBe(0);
    });
  });
});
