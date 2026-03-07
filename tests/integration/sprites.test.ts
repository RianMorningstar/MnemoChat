import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Create a temp directory for sprite storage during tests
const tmpSpritesDir = path.join(os.tmpdir(), `mnemochat-sprites-test-${Date.now()}`);

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    getPath: () => tmpSpritesDir,
  },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { spriteRoutes } from "../../src/main/server/routes/sprites";
import { db } from "../../src/main/db";
import { characters, messages, chats, connectionProfiles } from "../../src/main/db/schema";

// Create a minimal 1x1 red PNG for upload tests
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
);

function createFormBody(filename: string, buffer: Buffer, contentType = "image/png") {
  const boundary = "----TestBoundary" + Date.now();
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);
  return { body, boundary };
}

describe("sprite routes", () => {
  let app: FastifyInstance;
  let characterId: string;

  beforeAll(async () => {
    // Ensure tmp dir exists
    if (!fs.existsSync(tmpSpritesDir)) {
      fs.mkdirSync(tmpSpritesDir, { recursive: true });
    }

    app = Fastify();
    await spriteRoutes(app);
    await app.ready();

    // Create a test character
    characterId = crypto.randomUUID();
    db.insert(characters).values({
      id: characterId,
      name: "Sprite Test Char",
      createdAt: new Date().toISOString(),
    }).run();
  });

  afterAll(async () => {
    await app.close();
    // Clean up tmp dir
    if (fs.existsSync(tmpSpritesDir)) {
      fs.rmSync(tmpSpritesDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up sprites dir for this character between tests
    const charDir = path.join(tmpSpritesDir, "sprites", characterId);
    if (fs.existsSync(charDir)) {
      fs.rmSync(charDir, { recursive: true, force: true });
    }
  });

  // ── GET /api/sprites/:characterId ─────────────────────────────────────

  it("GET returns empty array when no sprites uploaded", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/sprites/${characterId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  // ── POST /api/sprites/:characterId/:expression ────────────────────────

  it("POST uploads a sprite and GET lists it", async () => {
    const { body, boundary } = createFormBody("joy.png", TINY_PNG);
    const uploadRes = await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/joy`,
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(uploadRes.statusCode).toBe(200);
    expect(uploadRes.json()).toEqual({ ok: true });

    // Verify it appears in the list
    const listRes = await app.inject({
      method: "GET",
      url: `/api/sprites/${characterId}`,
    });
    const sprites = listRes.json();
    expect(sprites).toHaveLength(1);
    expect(sprites[0].expression).toBe("joy");
    expect(sprites[0].url).toBe(`/api/sprites/${characterId}/joy`);
  });

  // ── GET /api/sprites/:characterId/:expression (serve image) ───────────

  it("GET serves uploaded sprite image", async () => {
    // Upload first
    const { body, boundary } = createFormBody("anger.png", TINY_PNG);
    await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/anger`,
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    // Serve it
    const res = await app.inject({
      method: "GET",
      url: `/api/sprites/${characterId}/anger`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });

  it("GET returns 404 for non-existent sprite", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/sprites/${characterId}/nonexistent`,
    });
    expect(res.statusCode).toBe(404);
  });

  // ── DELETE /api/sprites/:characterId/:expression ──────────────────────

  it("DELETE removes a single sprite", async () => {
    // Upload
    const { body, boundary } = createFormBody("sadness.png", TINY_PNG);
    await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/sadness`,
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    // Delete
    const delRes = await app.inject({
      method: "DELETE",
      url: `/api/sprites/${characterId}/sadness`,
    });
    expect(delRes.statusCode).toBe(200);

    // Verify it's gone
    const listRes = await app.inject({
      method: "GET",
      url: `/api/sprites/${characterId}`,
    });
    expect(listRes.json()).toEqual([]);
  });

  it("DELETE returns 404 for non-existent sprite", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/sprites/${characterId}/nonexistent`,
    });
    expect(res.statusCode).toBe(404);
  });

  // ── DELETE /api/sprites/:characterId (delete all) ─────────────────────

  it("DELETE all removes all sprites for character", async () => {
    // Upload two sprites
    const { body: b1, boundary: bd1 } = createFormBody("joy.png", TINY_PNG);
    await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/joy`,
      headers: { "content-type": `multipart/form-data; boundary=${bd1}` },
      payload: b1,
    });
    const { body: b2, boundary: bd2 } = createFormBody("anger.png", TINY_PNG);
    await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/anger`,
      headers: { "content-type": `multipart/form-data; boundary=${bd2}` },
      payload: b2,
    });

    // Verify both exist
    let listRes = await app.inject({ method: "GET", url: `/api/sprites/${characterId}` });
    expect(listRes.json()).toHaveLength(2);

    // Delete all
    const delRes = await app.inject({
      method: "DELETE",
      url: `/api/sprites/${characterId}`,
    });
    expect(delRes.statusCode).toBe(200);

    // Verify empty
    listRes = await app.inject({ method: "GET", url: `/api/sprites/${characterId}` });
    expect(listRes.json()).toEqual([]);
  });

  // ── Upload replaces existing sprite ───────────────────────────────────

  it("uploading a sprite for the same expression replaces the old one", async () => {
    // Upload first version
    const { body: b1, boundary: bd1 } = createFormBody("neutral.png", TINY_PNG);
    await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/neutral`,
      headers: { "content-type": `multipart/form-data; boundary=${bd1}` },
      payload: b1,
    });

    // Upload replacement (slightly different buffer)
    const biggerPng = Buffer.concat([TINY_PNG, Buffer.from([0, 0, 0])]);
    const { body: b2, boundary: bd2 } = createFormBody("neutral.png", biggerPng);
    await app.inject({
      method: "POST",
      url: `/api/sprites/${characterId}/neutral`,
      headers: { "content-type": `multipart/form-data; boundary=${bd2}` },
      payload: b2,
    });

    // Should still be just one sprite
    const listRes = await app.inject({ method: "GET", url: `/api/sprites/${characterId}` });
    expect(listRes.json()).toHaveLength(1);
  });

  // ── Classify expression route ─────────────────────────────────────────

  it("POST classify-expression returns null when character has no sprites", async () => {
    // Create a chat and message
    const chatId = crypto.randomUUID();
    const messageId = crypto.randomUUID();

    db.insert(chats).values({
      id: chatId,
      characterId,
      modelId: "llama3",
      modelName: "LLaMA 3",
      createdAt: new Date().toISOString(),
    }).run();

    db.insert(messages).values({
      id: messageId,
      chatId,
      role: "assistant",
      content: "Hello!",
      timestamp: new Date().toISOString(),
      characterId,
    }).run();

    const res = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/classify-expression`,
      payload: { messageId, content: "Hello!" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ expression: null });
  });

  it("POST classify-expression returns 404 for nonexistent message", async () => {
    const chatId = crypto.randomUUID();
    const res = await app.inject({
      method: "POST",
      url: `/api/chats/${chatId}/classify-expression`,
      payload: { messageId: "nonexistent", content: "Hello!" },
    });
    expect(res.statusCode).toBe(404);
  });
});
