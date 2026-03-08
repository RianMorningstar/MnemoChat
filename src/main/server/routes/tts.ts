import type { FastifyInstance } from "fastify";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { messages, characters, appSettings } from "../../db/schema";
import type { TtsProviderType, TtsSettings, TtsSynthesizeRequest } from "../../../shared/tts-types";
import { callTtsProvider, listTtsVoices } from "../lib/tts-providers";
import {
  getTtsFilePath,
  saveTtsAudio,
  deleteTtsAudio,
  deleteAllTtsAudio,
} from "../lib/tts-storage";

/** Read a setting from app_settings, returning null if not found */
function getSetting(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? null;
}

/** Resolve the TTS provider and voice for a character, falling back to global defaults */
function resolveTtsConfig(characterId: string | null): {
  provider: TtsProviderType | null;
  voice: string | null;
  apiKey: string | null;
  settings: TtsSettings | undefined;
  emotionEnabled: boolean;
} {
  let provider: TtsProviderType | null = null;
  let voice: string | null = null;
  let settings: TtsSettings | undefined;

  // Try character-level settings
  if (characterId) {
    const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
    if (char?.ttsProvider) {
      provider = char.ttsProvider as TtsProviderType;
      voice = char.ttsVoice;
      if (char.ttsSettings) {
        try { settings = JSON.parse(char.ttsSettings); } catch { /* ignore */ }
      }
    }
  }

  // Fall back to global defaults
  if (!provider) {
    provider = (getSetting("tts_default_provider") as TtsProviderType) || null;
  }
  if (!voice) {
    voice = getSetting("tts_default_voice");
  }

  // Resolve API key based on provider
  let apiKey: string | null = null;
  if (provider === "openai") {
    apiKey = getSetting("tts_openai_api_key");
  } else if (provider === "elevenlabs") {
    apiKey = getSetting("tts_elevenlabs_api_key");
  }

  const emotionEnabled = getSetting("tts_emotion_enabled") !== "false";

  return { provider, voice, apiKey, settings, emotionEnabled };
}

export async function ttsRoutes(app: FastifyInstance) {
  // Synthesize TTS for a message (uses cache)
  app.post(
    "/api/tts/synthesize",
    async (request, reply) => {
      const body = request.body as TtsSynthesizeRequest;
      const { messageId, text, characterId, emotion } = body;

      if (!text?.trim()) {
        return reply.status(400).send({ error: "No text provided" });
      }

      // Check cache first
      const cachedPath = getTtsFilePath(characterId, messageId);
      if (cachedPath) {
        const buffer = fs.readFileSync(cachedPath);
        return reply
          .header("Content-Type", "audio/mpeg")
          .header("Cache-Control", "public, max-age=31536000, immutable")
          .send(buffer);
      }

      // Resolve provider config (request overrides > character > global)
      const config = resolveTtsConfig(characterId);
      const provider = body.provider || config.provider;
      const voice = body.voice || config.voice;
      const settings = body.settings || config.settings;

      if (!provider) {
        return reply.status(400).send({ error: "No TTS provider configured" });
      }
      if (provider === "system") {
        return reply.status(400).send({ error: "System TTS is handled client-side" });
      }
      if (!voice) {
        return reply.status(400).send({ error: "No TTS voice configured" });
      }
      if (!config.apiKey) {
        return reply.status(400).send({ error: `No API key configured for ${provider}` });
      }

      // Call provider
      const audioBuffer = await callTtsProvider({
        provider,
        text,
        voice,
        apiKey: config.apiKey,
        settings,
        emotion,
        emotionEnabled: config.emotionEnabled,
      });

      // Cache to disk
      const relativePath = saveTtsAudio(characterId, messageId, audioBuffer, ".mp3");

      // Update message record
      db.update(messages)
        .set({ ttsAudioPath: relativePath })
        .where(eq(messages.id, messageId))
        .run();

      return reply
        .header("Content-Type", "audio/mpeg")
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .send(audioBuffer);
    }
  );

  // Serve cached TTS audio
  app.get<{ Params: { characterId: string; messageId: string } }>(
    "/api/tts/audio/:characterId/:messageId",
    async (request, reply) => {
      const { characterId, messageId } = request.params;
      const filePath = getTtsFilePath(characterId, messageId);
      if (!filePath) {
        return reply.status(404).send({ error: "Audio not found" });
      }
      const buffer = fs.readFileSync(filePath);
      return reply
        .header("Content-Type", "audio/mpeg")
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .send(buffer);
    }
  );

  // List available voices for a provider
  app.get<{ Params: { provider: string } }>(
    "/api/tts/voices/:provider",
    async (request, reply) => {
      const provider = request.params.provider as TtsProviderType;
      let apiKey: string | null = null;
      if (provider === "elevenlabs") {
        apiKey = getSetting("tts_elevenlabs_api_key");
        if (!apiKey) {
          return reply.status(400).send({ error: "ElevenLabs API key not configured" });
        }
      }
      const voices = await listTtsVoices(provider, apiKey ?? undefined);
      return voices;
    }
  );

  // Delete cached audio for a specific message
  app.delete<{ Params: { characterId: string; messageId: string } }>(
    "/api/tts/cache/:characterId/:messageId",
    async (request) => {
      const { characterId, messageId } = request.params;
      deleteTtsAudio(characterId, messageId);
      db.update(messages)
        .set({ ttsAudioPath: null })
        .where(eq(messages.id, messageId))
        .run();
      return { ok: true };
    }
  );

  // Delete all cached audio for a character
  app.delete<{ Params: { characterId: string } }>(
    "/api/tts/cache/:characterId",
    async (request) => {
      const { characterId } = request.params;
      deleteAllTtsAudio(characterId);
      return { ok: true };
    }
  );
}
