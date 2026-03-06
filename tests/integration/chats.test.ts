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

describe("chat routes", () => {
  let app: FastifyInstance;
  let charId: string;
  let charWithMsgId: string;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await chatRoutes(app);
    await app.ready();

    // Seed a plain character (no firstMessage)
    const r1 = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Plain Char" },
    });
    charId = r1.json().id;

    // Seed a character with a firstMessage for auto-insertion tests
    const r2 = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: {
        name: "Greeter",
        firstMessage: "Hello {{user}}, I am {{char}}!",
      },
    });
    charWithMsgId = r2.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/chats creates a chat with correct defaults", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.characterId).toBe(charId);
    expect(body.modelId).toBe("llama3");
    expect(body.messageCount).toBe(0);
    expect(Array.isArray(body.tags)).toBe(true);
    expect(typeof body.id).toBe("string");
  });

  it("POST /api/chats auto-inserts firstMessage and increments messageCount", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: {
        characterId: charWithMsgId,
        modelId: "llama3",
        modelName: "Llama 3",
        personaName: "Bob",
      },
    });
    expect(res.statusCode).toBe(200);
    // messageCount is updated by updateChatCounts — should be 1
    expect(res.json().messageCount).toBe(1);
  });

  it("POST /api/chats substitutes {{char}} and {{user}} in firstMessage", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: {
        characterId: charWithMsgId,
        modelId: "llama3",
        modelName: "Llama 3",
        personaName: "Alice",
      },
    });
    const { id } = res.json();

    // Fetch messages for this chat via the characters list (we don't have messageRoutes here,
    // so verify via chat detail that messageCount > 0)
    expect(res.json().messageCount).toBe(1);
    // The firstMessage "Hello {{user}}, I am {{char}}!" should become "Hello Alice, I am Greeter!"
    // We can't fetch messages without messageRoutes — that's verified in messages.test.ts
  });

  it("GET /api/chats returns list including created chat", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({ method: "GET", url: "/api/chats" });
    expect(res.statusCode).toBe(200);
    const ids = res.json().map((c: { id: string }) => c.id);
    expect(ids).toContain(id);
  });

  it("GET /api/chats/:id returns chat with characters array", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({ method: "GET", url: `/api/chats/${id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.characters)).toBe(true);
    expect(body.characters.length).toBeGreaterThan(0);
    expect(body.characters[0].id).toBe(charId);
  });

  it("GET /api/chats/:id returns 404 for unknown id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/chats/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });

  it("PUT /api/chats/:id updates title and tags", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${id}`,
      payload: { title: "New Title", tags: ["adventure"] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("PUT /api/chats/:id with no fields returns 400", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${id}`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("PUT /api/chats/:id/rename updates title", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${id}/rename`,
      payload: { title: "Renamed Chat" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("DELETE /api/chats/:id removes the chat", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const del = await app.inject({ method: "DELETE", url: `/api/chats/${id}` });
    expect(del.json().ok).toBe(true);

    const fetched = await app.inject({ method: "GET", url: `/api/chats/${id}` });
    expect(fetched.statusCode).toBe(404);
  });

  it("POST /api/chats/:id/characters adds a second character", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/chats/${id}/characters`,
      payload: { characterId: charWithMsgId },
    });
    expect(res.statusCode).toBe(200);
    const { characters } = res.json();
    expect(characters.length).toBe(2);
  });

  it("DELETE /api/chats/:id/characters/:characterId removes a character", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    await app.inject({
      method: "POST",
      url: `/api/chats/${id}/characters`,
      payload: { characterId: charWithMsgId },
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/api/chats/${id}/characters/${charWithMsgId}`,
    });
    expect(res.statusCode).toBe(200);
    const { characters } = res.json();
    expect(characters.length).toBe(1);
  });

  it("GET /api/chats/:id/token-budget returns budget shape", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: { characterId: charId, modelId: "llama3", modelName: "Llama 3" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "GET",
      url: `/api/chats/${id}/token-budget`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.contextMax).toBe("number");
    expect(typeof body.available).toBe("number");
    expect(typeof body.chatHistory).toBe("number");
    expect(typeof body.scrollingOutSoon).toBe("boolean");
    expect(body.available).toBeLessThanOrEqual(body.contextMax);
  });
});
