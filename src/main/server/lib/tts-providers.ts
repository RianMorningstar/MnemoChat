import type { TtsProviderType, TtsSettings, TtsVoice } from "../../../shared/tts-types";
import { OPENAI_TTS_VOICES } from "../../../shared/tts-types";
import { getEmotionParams } from "../../../shared/tts-emotion-map";

// ── OpenAI TTS ──────────────────────────────────────────

function buildOpenAiBody(
  text: string,
  voice: string,
  settings: TtsSettings | undefined,
  emotion: string | null | undefined,
  emotionEnabled: boolean,
) {
  const model = settings?.model || "tts-1";
  const body: Record<string, unknown> = {
    model,
    input: text,
    voice,
    response_format: "mp3",
  };
  if (settings?.speed) body.speed = settings.speed;

  // gpt-4o-mini-tts supports the instructions field for emotional modulation
  if (model === "gpt-4o-mini-tts" && emotionEnabled && emotion) {
    const params = getEmotionParams(emotion);
    body.instructions = params.openaiInstruction;
  }

  return body;
}

async function callOpenAi(
  text: string,
  voice: string,
  apiKey: string,
  settings: TtsSettings | undefined,
  emotion: string | null | undefined,
  emotionEnabled: boolean,
): Promise<Buffer> {
  const body = buildOpenAiBody(text, voice, settings, emotion, emotionEnabled);
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI TTS error ${res.status}: ${errText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function listOpenAiVoices(): TtsVoice[] {
  return OPENAI_TTS_VOICES.map((v) => ({
    id: v,
    name: v.charAt(0).toUpperCase() + v.slice(1),
    provider: "openai" as const,
    language: "en",
  }));
}

// ── ElevenLabs TTS ──────────────────────────────────────

function buildElevenLabsBody(
  text: string,
  settings: TtsSettings | undefined,
  emotion: string | null | undefined,
  emotionEnabled: boolean,
) {
  const voiceSettings: Record<string, number> = {
    stability: settings?.stability ?? 0.5,
    similarity_boost: settings?.similarityBoost ?? 0.75,
    style: settings?.style ?? 0.0,
  };

  if (emotionEnabled && emotion) {
    const params = getEmotionParams(emotion);
    voiceSettings.stability = params.elevenlabsStability;
    voiceSettings.similarity_boost = params.elevenlabsSimilarityBoost;
    voiceSettings.style = params.elevenlabsStyle;
  }

  return {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: voiceSettings,
  };
}

async function callElevenLabs(
  text: string,
  voice: string,
  apiKey: string,
  settings: TtsSettings | undefined,
  emotion: string | null | undefined,
  emotionEnabled: boolean,
): Promise<Buffer> {
  const body = buildElevenLabsBody(text, settings, emotion, emotionEnabled);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS error ${res.status}: ${errText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function listElevenLabsVoices(apiKey: string): Promise<TtsVoice[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`ElevenLabs voices error ${res.status}`);
  const data = (await res.json()) as {
    voices: Array<{
      voice_id: string;
      name: string;
      labels?: Record<string, string>;
      preview_url?: string;
    }>;
  };
  return data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    provider: "elevenlabs" as const,
    language: v.labels?.language || "en",
    previewUrl: v.preview_url,
  }));
}

// ── Public API ───────────────────────────────────────────

export interface CallTtsOptions {
  provider: TtsProviderType;
  text: string;
  voice: string;
  apiKey: string;
  settings?: TtsSettings;
  emotion?: string | null;
  emotionEnabled?: boolean;
}

/**
 * Call a TTS provider and return raw audio as a Buffer.
 * System provider is handled client-side — calling this with "system" throws.
 */
export async function callTtsProvider(opts: CallTtsOptions): Promise<Buffer> {
  const emotionEnabled = opts.emotionEnabled ?? true;
  switch (opts.provider) {
    case "openai":
      return callOpenAi(opts.text, opts.voice, opts.apiKey, opts.settings, opts.emotion, emotionEnabled);
    case "elevenlabs":
      return callElevenLabs(opts.text, opts.voice, opts.apiKey, opts.settings, opts.emotion, emotionEnabled);
    case "system":
      throw new Error("System TTS is handled client-side");
    default:
      throw new Error(`Unknown TTS provider: ${opts.provider}`);
  }
}

/** List available voices for a provider */
export async function listTtsVoices(
  provider: TtsProviderType,
  apiKey?: string,
): Promise<TtsVoice[]> {
  switch (provider) {
    case "openai":
      return listOpenAiVoices();
    case "elevenlabs":
      if (!apiKey) throw new Error("ElevenLabs API key is required");
      return listElevenLabsVoices(apiKey);
    case "system":
      // System voices are listed client-side via speechSynthesis.getVoices()
      return [];
    default:
      return [];
  }
}
