import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Create a temp directory for generated image storage during tests
const tmpImageDir = path.join(os.tmpdir(), `mnemochat-imagegen-test-${Date.now()}`);

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    getPath: () => tmpImageDir,
  },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

// Minimal 1x1 red PNG (valid image)
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

// Mock image-gen-providers to avoid real API calls
vi.mock("../../src/main/server/lib/image-gen-providers", () => ({
  callImageGenProvider: vi.fn(async () => ({
    buffer: TINY_PNG,
    ext: ".png",
    width: 512,
    height: 512,
    seed: 42,
  })),
  listImageGenModels: vi.fn(async () => ["model-a", "model-b"]),
  listImageGenSamplers: vi.fn(async () => ["euler", "ddim"]),
  checkImageGenConnection: vi.fn(async () => true),
}));

import Fastify, { type FastifyInstance } from "fastify";
import { imageGenRoutes } from "../../src/main/server/routes/image-gen";
import { db } from "../../src/main/db";
import { characters, chats, messages, appSettings, generatedImages } from "../../src/main/db/schema";
import { callImageGenProvider } from "../../src/main/server/lib/image-gen-providers";
import { eq } from "drizzle-orm";

describe("image-gen routes", () => {
  let app: FastifyInstance;
  let characterId: string;
  let chatId: string;
  let messageId: string;

  beforeAll(async () => {
    if (!fs.existsSync(tmpImageDir)) {
      fs.mkdirSync(tmpImageDir, { recursive: true });
    }

    app = Fastify();
    await imageGenRoutes(app);
    await app.ready();

    // Create test character
    characterId = crypto.randomUUID();
    db.insert(characters).values({
      id: characterId,
      name: "ImageGen Test Char",
      createdAt: new Date().toISOString(),
      imageGenPromptPrefix: "anime style",
    }).run();

    // Create test chat
    chatId = crypto.randomUUID();
    db.insert(chats).values({
      id: chatId,
      characterId,
      modelId: "llama3",
      modelName: "LLaMA 3",
      createdAt: new Date().toISOString(),
    }).run();

    // Create test message
    messageId = crypto.randomUUID();
    db.insert(messages).values({
      id: messageId,
      chatId,
      role: "assistant",
      content: "Here is your image.",
      timestamp: new Date().toISOString(),
      characterId,
    }).run();

    // Set global image gen settings
    const now = new Date().toISOString();
    db.insert(appSettings).values({ key: "image_gen_provider", value: "pollinations", updatedAt: now }).run();
    db.insert(appSettings).values({ key: "image_gen_default_steps", value: "20", updatedAt: now }).run();
    db.insert(appSettings).values({ key: "image_gen_default_cfg", value: "7", updatedAt: now }).run();
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(tmpImageDir)) {
      fs.rmSync(tmpImageDir, { recursive: true, force: true });
    }
  });

  // ── POST /api/image-gen/generate ────────────────────────────────────

  describe("POST /api/image-gen/generate", () => {
    it("returns 400 when no prompt provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "", characterId },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("No prompt");
    });

    it("returns 400 when no provider configured", async () => {
      db.delete(appSettings).where(eq(appSettings.key, "image_gen_provider")).run();

      const res = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "a cat", characterId: "nonexistent" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("No image generation provider");

      db.insert(appSettings).values({
        key: "image_gen_provider",
        value: "pollinations",
        updatedAt: new Date().toISOString(),
      }).run();
    });

    it("generates an image, saves to disk, and returns result", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "a beautiful sunset", characterId, chatId },
      });

      expect(res.statusCode).toBe(200);
      const result = res.json();
      expect(result.id).toBeTruthy();
      expect(result.prompt).toContain("anime style");
      expect(result.prompt).toContain("a beautiful sunset");
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
      expect(result.seed).toBe(42);
      expect(result.provider).toBe("pollinations");
      expect(result.imageUrl).toContain(result.id);
      expect(callImageGenProvider).toHaveBeenCalled();

      // Verify DB record
      const record = db.select().from(generatedImages).where(eq(generatedImages.id, result.id)).get();
      expect(record).toBeTruthy();
      expect(record!.characterId).toBe(characterId);
      expect(record!.chatId).toBe(chatId);
    });

    it("prepends character prompt prefix to the prompt", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "a dragon", characterId },
      });

      const result = res.json();
      expect(result.prompt).toBe("anime style, a dragon");
    });

    it("links image to message when messageId provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "portrait", characterId, chatId, messageId },
      });

      expect(res.statusCode).toBe(200);
      const result = res.json();

      const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
      expect(msg?.generatedImagePath).toBeTruthy();
      expect(msg?.generatedImagePath).toContain(result.id);
    });
  });

  // ── GET /api/image-gen/images/:imageId ──────────────────────────────

  describe("GET /api/image-gen/images/:imageId", () => {
    it("returns 404 for nonexistent image", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/image-gen/images/nonexistent-id",
      });
      expect(res.statusCode).toBe(404);
    });

    it("serves a generated image file", async () => {
      // Generate first
      const genRes = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "test image", characterId },
      });
      const imageId = genRes.json().id;

      const res = await app.inject({
        method: "GET",
        url: `/api/image-gen/images/${imageId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["cache-control"]).toContain("immutable");
      expect(res.rawPayload.length).toBeGreaterThan(0);
    });
  });

  // ── GET /api/image-gen/gallery/:characterId ─────────────────────────

  describe("GET /api/image-gen/gallery/:characterId", () => {
    it("returns generated images for a character", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/image-gen/gallery/${characterId}`,
      });
      expect(res.statusCode).toBe(200);
      const gallery = res.json();
      expect(Array.isArray(gallery)).toBe(true);
      expect(gallery.length).toBeGreaterThan(0);
      expect(gallery[0].imageUrl).toBeTruthy();
      expect(gallery[0].settings).toBeDefined();
    });

    it("returns empty array for character with no images", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/image-gen/gallery/nonexistent-char",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  // ── GET /api/image-gen/gallery/chat/:chatId ─────────────────────────

  describe("GET /api/image-gen/gallery/chat/:chatId", () => {
    it("returns generated images for a chat", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/image-gen/gallery/chat/${chatId}`,
      });
      expect(res.statusCode).toBe(200);
      const gallery = res.json();
      expect(Array.isArray(gallery)).toBe(true);
      expect(gallery.length).toBeGreaterThan(0);
    });
  });

  // ── GET /api/image-gen/models/:provider ─────────────────────────────

  describe("GET /api/image-gen/models/:provider", () => {
    it("returns available models", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/image-gen/models/automatic1111",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().models).toEqual(["model-a", "model-b"]);
    });
  });

  // ── GET /api/image-gen/samplers/:provider ───────────────────────────

  describe("GET /api/image-gen/samplers/:provider", () => {
    it("returns available samplers", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/image-gen/samplers/automatic1111",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().samplers).toEqual(["euler", "ddim"]);
    });
  });

  // ── GET /api/image-gen/check/:provider ──────────────────────────────

  describe("GET /api/image-gen/check/:provider", () => {
    it("returns connection status", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/image-gen/check/pollinations",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
    });
  });

  // ── POST /api/image-gen/images/:imageId/set-portrait ────────────────

  describe("POST /api/image-gen/images/:imageId/set-portrait", () => {
    it("returns 404 for nonexistent image", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/image-gen/images/nonexistent/set-portrait",
      });
      expect(res.statusCode).toBe(404);
    });

    it("sets generated image as character portrait", async () => {
      // Generate an image first
      const genRes = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "portrait photo", characterId },
      });
      const imageId = genRes.json().id;

      // Set as portrait
      const res = await app.inject({
        method: "POST",
        url: `/api/image-gen/images/${imageId}/set-portrait`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.ok).toBe(true);
      expect(body.portraitUrl).toMatch(/^data:image\/png;base64,/);

      // Verify character's portraitUrl was updated in DB
      const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
      expect(char?.portraitUrl).toBe(body.portraitUrl);
    });

    it("returns 400 for image not linked to a character", async () => {
      // Insert an image record with no characterId
      const imageId = crypto.randomUUID();
      const imgDir = path.join(tmpImageDir, "generated-images", "_global");
      fs.mkdirSync(imgDir, { recursive: true });
      fs.writeFileSync(path.join(imgDir, `${imageId}.png`), TINY_PNG);

      db.insert(generatedImages).values({
        id: imageId,
        characterId: null,
        prompt: "test",
        provider: "pollinations",
        relativePath: `_global/${imageId}.png`,
        createdAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: "POST",
        url: `/api/image-gen/images/${imageId}/set-portrait`,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("not linked to a character");
    });
  });

  // ── DELETE /api/image-gen/images/:imageId ────────────────────────────

  describe("DELETE /api/image-gen/images/:imageId", () => {
    it("deletes a generated image and its file", async () => {
      // Generate first
      const genRes = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "to delete", characterId },
      });
      const imageId = genRes.json().id;

      // Verify it exists
      const before = db.select().from(generatedImages).where(eq(generatedImages.id, imageId)).get();
      expect(before).toBeTruthy();

      // Delete
      const res = await app.inject({
        method: "DELETE",
        url: `/api/image-gen/images/${imageId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });

      // Verify DB record removed
      const after = db.select().from(generatedImages).where(eq(generatedImages.id, imageId)).get();
      expect(after).toBeUndefined();
    });

    it("returns ok even for nonexistent image", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/image-gen/images/nonexistent",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });

    it("clears message reference when deleting linked image", async () => {
      // Generate linked to message
      const msgId2 = crypto.randomUUID();
      db.insert(messages).values({
        id: msgId2,
        chatId,
        role: "assistant",
        content: "Test",
        timestamp: new Date().toISOString(),
        characterId,
      }).run();

      const genRes = await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "linked image", characterId, chatId, messageId: msgId2 },
      });
      const imageId = genRes.json().id;

      // Verify message has reference
      let msg = db.select().from(messages).where(eq(messages.id, msgId2)).get();
      expect(msg?.generatedImagePath).toBeTruthy();

      // Delete the image
      await app.inject({
        method: "DELETE",
        url: `/api/image-gen/images/${imageId}`,
      });

      // Verify message reference cleared
      msg = db.select().from(messages).where(eq(messages.id, msgId2)).get();
      expect(msg?.generatedImagePath).toBeNull();
    });
  });

  // ── DELETE /api/image-gen/gallery/:characterId ──────────────────────

  describe("DELETE /api/image-gen/gallery/:characterId", () => {
    it("deletes all generated images for a character", async () => {
      // Generate two images
      await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "batch 1", characterId },
      });
      await app.inject({
        method: "POST",
        url: "/api/image-gen/generate",
        payload: { prompt: "batch 2", characterId },
      });

      // Verify some images exist
      const before = db.select().from(generatedImages).where(eq(generatedImages.characterId, characterId)).all();
      expect(before.length).toBeGreaterThan(0);

      // Delete all
      const res = await app.inject({
        method: "DELETE",
        url: `/api/image-gen/gallery/${characterId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });

      // Verify all records removed
      const after = db.select().from(generatedImages).where(eq(generatedImages.characterId, characterId)).all();
      expect(after).toHaveLength(0);
    });
  });
});
