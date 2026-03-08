import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { callTtsProvider, listTtsVoices } from "../../src/main/server/lib/tts-providers";
import type { CallTtsOptions } from "../../src/main/server/lib/tts-providers";

const FAKE_AUDIO = Buffer.from("fake-audio-data");

describe("callTtsProvider", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── OpenAI ──────────────────────────────────────────────────────────

  describe("openai", () => {
    const baseOpts: CallTtsOptions = {
      provider: "openai",
      text: "Hello world",
      voice: "alloy",
      apiKey: "sk-test-key",
    };

    it("sends correct URL and headers", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider(baseOpts);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/audio/speech");
      expect(init.headers["Authorization"]).toBe("Bearer sk-test-key");
      expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("sends correct body shape with default model", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider(baseOpts);

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.model).toBe("tts-1");
      expect(body.input).toBe("Hello world");
      expect(body.voice).toBe("alloy");
      expect(body.response_format).toBe("mp3");
    });

    it("includes instructions when gpt-4o-mini-tts + emotion enabled", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider({
        ...baseOpts,
        settings: { model: "gpt-4o-mini-tts" },
        emotion: "joy",
        emotionEnabled: true,
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.model).toBe("gpt-4o-mini-tts");
      expect(body.instructions).toBeTypeOf("string");
      expect(body.instructions.length).toBeGreaterThan(0);
    });

    it("does NOT include instructions with tts-1 model even with emotion", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider({
        ...baseOpts,
        settings: { model: "tts-1" },
        emotion: "joy",
        emotionEnabled: true,
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.instructions).toBeUndefined();
    });

    it("includes speed when provided in settings", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider({
        ...baseOpts,
        settings: { speed: 1.5 },
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.speed).toBe(1.5);
    });

    it("throws on HTTP error with status and body", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Rate limited",
      });

      await expect(callTtsProvider(baseOpts)).rejects.toThrow("OpenAI TTS error 429: Rate limited");
    });

    it("returns Buffer from successful response", async () => {
      const audioData = new Uint8Array([1, 2, 3, 4]).buffer;
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => audioData,
      });

      const result = await callTtsProvider(baseOpts);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(4);
    });
  });

  // ── ElevenLabs ──────────────────────────────────────────────────────

  describe("elevenlabs", () => {
    const baseOpts: CallTtsOptions = {
      provider: "elevenlabs",
      text: "Hello world",
      voice: "voice-id-123",
      apiKey: "el-test-key",
    };

    it("sends correct URL with voice ID and headers", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider(baseOpts);

      const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-id-123");
      expect(init.headers["xi-api-key"]).toBe("el-test-key");
      expect(init.headers["Accept"]).toBe("audio/mpeg");
    });

    it("sends correct body shape with default settings", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider(baseOpts);

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.text).toBe("Hello world");
      expect(body.model_id).toBe("eleven_multilingual_v2");
      expect(body.voice_settings.stability).toBe(0.5);
      expect(body.voice_settings.similarity_boost).toBe(0.75);
      expect(body.voice_settings.style).toBe(0.0);
    });

    it("overrides voice_settings when emotion enabled", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider({
        ...baseOpts,
        emotion: "joy",
        emotionEnabled: true,
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      // joy is HIGH_ENERGY_POSITIVE: stability 0.3, style 0.8
      expect(body.voice_settings.stability).toBe(0.3);
      expect(body.voice_settings.style).toBe(0.8);
    });

    it("uses settings defaults when emotion disabled", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        arrayBuffer: async () => FAKE_AUDIO.buffer.slice(0),
      });

      await callTtsProvider({
        ...baseOpts,
        settings: { stability: 0.7, similarityBoost: 0.9, style: 0.3 },
        emotion: "joy",
        emotionEnabled: false,
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.voice_settings.stability).toBe(0.7);
      expect(body.voice_settings.similarity_boost).toBe(0.9);
      expect(body.voice_settings.style).toBe(0.3);
    });

    it("throws on HTTP error", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(callTtsProvider(baseOpts)).rejects.toThrow("ElevenLabs TTS error 401: Unauthorized");
    });
  });

  // ── System / Unknown ────────────────────────────────────────────────

  it("throws for system provider", async () => {
    await expect(
      callTtsProvider({ provider: "system", text: "hi", voice: "v", apiKey: "k" })
    ).rejects.toThrow("System TTS is handled client-side");
  });

  it("throws for unknown provider", async () => {
    await expect(
      callTtsProvider({ provider: "unknown" as any, text: "hi", voice: "v", apiKey: "k" })
    ).rejects.toThrow("Unknown TTS provider");
  });
});

// ── listTtsVoices ───────────────────────────────────────────────────────

describe("listTtsVoices", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns 10 OpenAI voices without calling fetch", async () => {
    const voices = await listTtsVoices("openai");
    expect(voices).toHaveLength(10);
    expect(voices[0]).toEqual({
      id: "alloy",
      name: "Alloy",
      provider: "openai",
      language: "en",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns ElevenLabs voices by calling API", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          { voice_id: "v1", name: "Rachel", labels: { language: "en" }, preview_url: "https://example.com/preview" },
          { voice_id: "v2", name: "Domi", labels: {}, preview_url: null },
        ],
      }),
    });

    const voices = await listTtsVoices("elevenlabs", "el-key");
    expect(voices).toHaveLength(2);
    expect(voices[0]).toEqual({
      id: "v1",
      name: "Rachel",
      provider: "elevenlabs",
      language: "en",
      previewUrl: "https://example.com/preview",
    });
    expect(voices[1].language).toBe("en"); // fallback
  });

  it("throws when ElevenLabs API key not provided", async () => {
    await expect(listTtsVoices("elevenlabs")).rejects.toThrow("ElevenLabs API key is required");
  });

  it("returns empty array for system provider", async () => {
    const voices = await listTtsVoices("system");
    expect(voices).toEqual([]);
  });

  it("returns empty array for unknown provider", async () => {
    const voices = await listTtsVoices("unknown" as any);
    expect(voices).toEqual([]);
  });
});
