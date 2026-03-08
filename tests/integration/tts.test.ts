import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Create a temp directory for audio storage during tests
const tmpAudioDir = path.join(os.tmpdir(), `mnemochat-tts-test-${Date.now()}`);

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    getPath: () => tmpAudioDir,
  },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

const FAKE_AUDIO = Buffer.from("fake-mp3-audio-data-for-testing");

// Mock tts-providers to avoid real API calls
vi.mock("../../src/main/server/lib/tts-providers", () => ({
  callTtsProvider: vi.fn(async () => FAKE_AUDIO),
  listTtsVoices: vi.fn(async (provider: string) => {
    if (provider === "openai") {
      return [
        { id: "alloy", name: "Alloy", provider: "openai", language: "en" },
        { id: "nova", name: "Nova", provider: "openai", language: "en" },
      ];
    }
    return [];
  }),
}));

import Fastify, { type FastifyInstance } from "fastify";
import { ttsRoutes } from "../../src/main/server/routes/tts";
import { db } from "../../src/main/db";
import { characters, chats, messages, appSettings } from "../../src/main/db/schema";
import { callTtsProvider } from "../../src/main/server/lib/tts-providers";
import { eq } from "drizzle-orm";

describe("tts routes", () => {
  let app: FastifyInstance;
  let characterId: string;
  let chatId: string;
  let messageId: string;

  beforeAll(async () => {
    if (!fs.existsSync(tmpAudioDir)) {
      fs.mkdirSync(tmpAudioDir, { recursive: true });
    }

    app = Fastify();
    await ttsRoutes(app);
    await app.ready();

    // Create test character
    characterId = crypto.randomUUID();
    db.insert(characters).values({
      id: characterId,
      name: "TTS Test Char",
      createdAt: new Date().toISOString(),
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
      content: "Hello, I am a test character.",
      timestamp: new Date().toISOString(),
      characterId,
    }).run();

    // Set global TTS settings
    const now = new Date().toISOString();
    db.insert(appSettings).values({ key: "tts_default_provider", value: "openai", updatedAt: now }).run();
    db.insert(appSettings).values({ key: "tts_default_voice", value: "alloy", updatedAt: now }).run();
    db.insert(appSettings).values({ key: "tts_openai_api_key", value: "sk-test-key", updatedAt: now }).run();
    db.insert(appSettings).values({ key: "tts_emotion_enabled", value: "true", updatedAt: now }).run();
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(tmpAudioDir)) {
      fs.rmSync(tmpAudioDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clear audio dir between tests
    const charDir = path.join(tmpAudioDir, "audio", characterId);
    if (fs.existsSync(charDir)) {
      fs.rmSync(charDir, { recursive: true, force: true });
    }
    // Reset mock call counts
    vi.mocked(callTtsProvider).mockClear();
  });

  // ── POST /api/tts/synthesize ────────────────────────────────────────

  describe("POST /api/tts/synthesize", () => {
    it("returns 400 when no text provided", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "", characterId },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("No text");
    });

    it("returns 400 when no provider configured", async () => {
      // Temporarily remove default provider
      db.delete(appSettings).where(eq(appSettings.key, "tts_default_provider")).run();

      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId: "nonexistent-char" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("No TTS provider");

      // Restore
      db.insert(appSettings).values({ key: "tts_default_provider", value: "openai", updatedAt: new Date().toISOString() }).run();
    });

    it("returns 400 when provider is system", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId, provider: "system" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("client-side");
    });

    it("returns 400 when no voice configured", async () => {
      db.delete(appSettings).where(eq(appSettings.key, "tts_default_voice")).run();

      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId: "nonexistent-char" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("No TTS voice");

      db.insert(appSettings).values({ key: "tts_default_voice", value: "alloy", updatedAt: new Date().toISOString() }).run();
    });

    it("returns 400 when no API key configured", async () => {
      db.delete(appSettings).where(eq(appSettings.key, "tts_openai_api_key")).run();

      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("No API key");

      db.insert(appSettings).values({ key: "tts_openai_api_key", value: "sk-test-key", updatedAt: new Date().toISOString() }).run();
    });

    it("synthesizes audio, returns it, and caches to disk", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello world", characterId, emotion: "joy" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("audio/mpeg");
      expect(res.headers["cache-control"]).toContain("immutable");
      expect(res.rawPayload.length).toBeGreaterThan(0);
      expect(callTtsProvider).toHaveBeenCalledTimes(1);

      // Verify file cached on disk
      const audioDir = path.join(tmpAudioDir, "audio", characterId);
      expect(fs.existsSync(audioDir)).toBe(true);
      const files = fs.readdirSync(audioDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(`${messageId}.mp3`);
    });

    it("serves from cache on second request without calling provider again", async () => {
      // First request — creates cache
      await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello world", characterId },
      });
      expect(callTtsProvider).toHaveBeenCalledTimes(1);

      vi.mocked(callTtsProvider).mockClear();

      // Second request — should use cache
      const res = await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello world", characterId },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("audio/mpeg");
      expect(callTtsProvider).not.toHaveBeenCalled();
    });

    it("updates messages.tts_audio_path in DB", async () => {
      await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello world", characterId },
      });

      const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
      expect(msg?.ttsAudioPath).toBeTruthy();
      expect(msg?.ttsAudioPath).toContain(characterId);
      expect(msg?.ttsAudioPath).toContain(messageId);
    });
  });

  // ── GET /api/tts/audio/:characterId/:messageId ─────────────────────

  describe("GET /api/tts/audio/:characterId/:messageId", () => {
    it("returns 404 when no cached audio exists", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/tts/audio/${characterId}/nonexistent-msg`,
      });
      expect(res.statusCode).toBe(404);
    });

    it("serves cached audio after synthesis", async () => {
      // Synthesize first
      await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId },
      });

      const res = await app.inject({
        method: "GET",
        url: `/api/tts/audio/${characterId}/${messageId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("audio/mpeg");
      expect(res.headers["cache-control"]).toContain("immutable");
      expect(res.rawPayload.length).toBeGreaterThan(0);
    });
  });

  // ── GET /api/tts/voices/:provider ──────────────────────────────────

  describe("GET /api/tts/voices/:provider", () => {
    it("returns OpenAI voices list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/tts/voices/openai",
      });
      expect(res.statusCode).toBe(200);
      const voices = res.json();
      expect(voices).toHaveLength(2);
      expect(voices[0].id).toBe("alloy");
    });

    it("returns 400 for ElevenLabs without API key", async () => {
      db.delete(appSettings).where(eq(appSettings.key, "tts_elevenlabs_api_key")).run();

      const res = await app.inject({
        method: "GET",
        url: "/api/tts/voices/elevenlabs",
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("API key");
    });
  });

  // ── DELETE /api/tts/cache/:characterId/:messageId ──────────────────

  describe("DELETE /api/tts/cache/:characterId/:messageId", () => {
    it("deletes cached file and clears DB path", async () => {
      // Synthesize first
      await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId },
      });

      // Verify cache exists
      const audioDir = path.join(tmpAudioDir, "audio", characterId);
      expect(fs.readdirSync(audioDir)).toHaveLength(1);

      // Delete
      const res = await app.inject({
        method: "DELETE",
        url: `/api/tts/cache/${characterId}/${messageId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });

      // Verify file deleted
      const files = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];
      expect(files).toHaveLength(0);

      // Verify DB cleared
      const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
      expect(msg?.ttsAudioPath).toBeNull();
    });

    it("returns ok even when no file existed", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/tts/cache/${characterId}/nonexistent-msg`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });
  });

  // ── DELETE /api/tts/cache/:characterId ─────────────────────────────

  describe("DELETE /api/tts/cache/:characterId", () => {
    it("deletes all cached audio for character", async () => {
      // Synthesize for two messages
      const messageId2 = crypto.randomUUID();
      db.insert(messages).values({
        id: messageId2,
        chatId,
        role: "assistant",
        content: "Second message",
        timestamp: new Date().toISOString(),
        characterId,
      }).run();

      await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId, text: "Hello", characterId },
      });
      await app.inject({
        method: "POST",
        url: "/api/tts/synthesize",
        payload: { messageId: messageId2, text: "World", characterId },
      });

      // Verify two files exist
      const audioDir = path.join(tmpAudioDir, "audio", characterId);
      expect(fs.readdirSync(audioDir)).toHaveLength(2);

      // Delete all
      const res = await app.inject({
        method: "DELETE",
        url: `/api/tts/cache/${characterId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });

      // Verify directory removed
      expect(fs.existsSync(audioDir)).toBe(false);
    });
  });
});
