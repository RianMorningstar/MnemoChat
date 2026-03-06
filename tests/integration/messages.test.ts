import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { characterRoutes } from "../../src/main/server/routes/characters";
import { chatRoutes } from "../../src/main/server/routes/chats";
import { messageRoutes } from "../../src/main/server/routes/messages";

describe("message routes", () => {
  let app: FastifyInstance;
  let chatId: string;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await chatRoutes(app);
    await messageRoutes(app);
    await app.ready();

    // Seed: character with NO firstMessage so chat starts with 0 messages
    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "MsgTestChar" },
    });
    const { id: charId } = charRes.json();

    const chatRes = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    chatId = chatRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/chats/:chatId/messages returns empty array for a new chat", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/chats/${chatId}/messages`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/chats/:chatId/messages persists a user message", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "user", content: "Hello there" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.role).toBe("user");
    expect(body.content).toBe("Hello there");
    expect(body.isSystemMessage).toBe(false);
    expect(body.bookmark).toBeNull();
    expect(typeof body.id).toBe("string");
  });

  it("POST message updates chat messageCount and wordCount", async () => {
    // Create a fresh chat for this test
    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "CountChar" },
    });
    const { id: cid } = charRes.json();
    const chatRes = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: cid, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id: newChatId } = chatRes.json();

    await app.inject({
      method: "POST",
      url: `/api/chats/${newChatId}/messages`,
      payload: { role: "user", content: "three words here" },
    });

    const chatDetail = await app.inject({
      method: "GET",
      url: `/api/chats/${newChatId}`,
    });
    expect(chatDetail.json().messageCount).toBe(1);
    expect(chatDetail.json().wordCount).toBe(3);
  });

  it("PUT /api/messages/:id updates message content", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "assistant", content: "Original content" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/messages/${id}`,
      payload: { content: "Edited content" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("DELETE /api/messages/:id removes the message", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "user", content: "Delete me" },
    });
    const { id } = created.json();

    const del = await app.inject({
      method: "DELETE",
      url: `/api/messages/${id}`,
    });
    expect(del.json().ok).toBe(true);

    // Verify it's gone
    const msgs = await app.inject({
      method: "GET",
      url: `/api/chats/${chatId}/messages`,
    });
    const ids = msgs.json().map((m: { id: string }) => m.id);
    expect(ids).not.toContain(id);
  });

  it("POST /api/messages/:messageId/swipes creates a swipe alternative", async () => {
    const msg = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "assistant", content: "Original" },
    });
    const { id: msgId } = msg.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/messages/${msgId}/swipes`,
      payload: { content: "Alternative response", model: "llama3" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.content).toBe("Alternative response");
    expect(body.index).toBe(0);
    expect(body.messageId).toBe(msgId);
  });

  it("GET /api/messages/:messageId/swipes returns swipe list", async () => {
    const msg = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "assistant", content: "Original" },
    });
    const { id: msgId } = msg.json();

    await app.inject({
      method: "POST",
      url: `/api/messages/${msgId}/swipes`,
      payload: { content: "Swipe 1", model: "llama3" },
    });
    await app.inject({
      method: "POST",
      url: `/api/messages/${msgId}/swipes`,
      payload: { content: "Swipe 2", model: "llama3" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/messages/${msgId}/swipes`,
    });
    expect(res.statusCode).toBe(200);
    const swipes = res.json();
    expect(swipes.length).toBe(2);
    expect(swipes[0].index).toBe(0);
    expect(swipes[1].index).toBe(1);
  });

  it("POST /api/messages/:messageId/bookmark creates a bookmark", async () => {
    const msg = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "user", content: "Bookmark this" },
    });
    const { id: msgId } = msg.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/messages/${msgId}/bookmark`,
      payload: { label: "Great moment", color: "amber" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.label).toBe("Great moment");
    expect(body.color).toBe("amber");
    expect(body.messageId).toBe(msgId);
    expect(body.chatId).toBe(chatId);
  });

  it("GET /api/chats/:chatId/bookmarks returns bookmark list", async () => {
    // Create a fresh chat for this isolated test
    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "BmChar" },
    });
    const chatRes = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charRes.json().id, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id: bmChatId } = chatRes.json();

    const msg = await app.inject({
      method: "POST",
      url: `/api/chats/${bmChatId}/messages`,
      payload: { role: "user", content: "Memorable line" },
    });
    await app.inject({
      method: "POST",
      url: `/api/messages/${msg.json().id}/bookmark`,
      payload: { label: "Notable" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/chats/${bmChatId}/bookmarks`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);
    expect(res.json()[0].label).toBe("Notable");
  });

  it("DELETE /api/bookmarks/:id removes a bookmark", async () => {
    const msg = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/messages`,
      payload: { role: "user", content: "Mark then unmark" },
    });
    const { id: msgId } = msg.json();

    const bm = await app.inject({
      method: "POST",
      url: `/api/messages/${msgId}/bookmark`,
      payload: { label: "Temp" },
    });
    const { id: bmId } = bm.json();

    const del = await app.inject({
      method: "DELETE",
      url: `/api/bookmarks/${bmId}`,
    });
    expect(del.json().ok).toBe(true);
  });
});
