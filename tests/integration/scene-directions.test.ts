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
import { sceneDirectionRoutes } from "../../src/main/server/routes/scene-directions";

describe("scene direction routes", () => {
  let app: FastifyInstance;
  let chatId: string;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await chatRoutes(app);
    await sceneDirectionRoutes(app);
    await app.ready();

    // Seed character + chat (chat creation auto-creates a scene direction)
    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "SceneChar" },
    });
    const chatRes = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: {
        characterId: charRes.json().id,
        modelId: "llama3",
        modelName: "Llama 3",
      },
    });
    chatId = chatRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/chats/:chatId/scene-direction returns auto-created direction", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/chats/${chatId}/scene-direction`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.text).toBe("");
    expect(body.enabled).toBe(false);
    expect(body.injectionDepth).toBe(4);
    expect(body.tokenCount).toBe(0);
  });

  it("PUT updates text and auto-calculates tokenCount", async () => {
    const text = "The hero enters the dark forest."; // 32 chars → ceil(32/4) = 8
    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${chatId}/scene-direction`,
      payload: { text },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().text).toBe(text);
    expect(res.json().tokenCount).toBe(Math.ceil(text.length / 4));
  });

  it("PUT with enabled=true sets enabled to true", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${chatId}/scene-direction`,
      payload: { enabled: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().enabled).toBe(true);
  });

  it("PUT with injectionDepth updates that field", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${chatId}/scene-direction`,
      payload: { injectionDepth: 8 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().injectionDepth).toBe(8);
  });

  it("PUT with empty text resets tokenCount to 0", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/chats/${chatId}/scene-direction`,
      payload: { text: "" },
    });
    expect(res.json().tokenCount).toBe(0);
  });

  it("chat creation seeds scene direction from character authorNote", async () => {
    // Create a character with an author note
    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: {
        name: "DarkFantasyChar",
        authorNote: "Dark fantasy atmosphere with gothic undertones",
        authorNoteDepth: 6,
      },
    });
    const charBody = charRes.json();

    // Create a chat with that character
    const chatRes = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: {
        characterId: charBody.id,
        modelId: "llama3",
        modelName: "Llama 3",
      },
    });
    const newChatId = chatRes.json().id;

    // Scene direction should be seeded from author note
    const sdRes = await app.inject({
      method: "GET",
      url: `/api/chats/${newChatId}/scene-direction`,
    });
    expect(sdRes.statusCode).toBe(200);
    const sd = sdRes.json();
    expect(sd.text).toBe("Dark fantasy atmosphere with gothic undertones");
    expect(sd.injectionDepth).toBe(6);
    expect(sd.enabled).toBe(true);
    expect(sd.tokenCount).toBe(Math.ceil(46 / 4)); // 46 chars
  });

  it("chat creation without authorNote keeps scene direction blank and disabled", async () => {
    // Create a character without an author note
    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "PlainChar" },
    });

    const chatRes = await app.inject({
      method: "POST",
      url: "/api/chats",
      payload: {
        characterId: charRes.json().id,
        modelId: "llama3",
        modelName: "Llama 3",
      },
    });

    const sdRes = await app.inject({
      method: "GET",
      url: `/api/chats/${chatRes.json().id}/scene-direction`,
    });
    expect(sdRes.statusCode).toBe(200);
    const sd = sdRes.json();
    expect(sd.text).toBe("");
    expect(sd.enabled).toBe(false);
    expect(sd.injectionDepth).toBe(4);
    expect(sd.tokenCount).toBe(0);
  });

  it("GET on unknown chatId returns default shape", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/chats/nonexistent-chat-id/scene-direction",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.text).toBe("");
    expect(body.enabled).toBe(false);
    expect(body.tokenCount).toBe(0);
  });
});
