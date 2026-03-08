/** TTS provider identifiers */
export type TtsProviderType = "system" | "openai" | "elevenlabs";

/** A voice available from a TTS provider */
export interface TtsVoice {
  id: string;
  name: string;
  provider: TtsProviderType;
  language?: string;
  previewUrl?: string;
}

/** Per-character TTS settings stored as JSON in characters.tts_settings */
export interface TtsSettings {
  /** OpenAI model: tts-1, tts-1-hd, gpt-4o-mini-tts */
  model?: string;
  /** Playback speed (0.25–4.0 for OpenAI) */
  speed?: number;
  /** ElevenLabs voice stability (0–1) */
  stability?: number;
  /** ElevenLabs similarity boost (0–1) */
  similarityBoost?: number;
  /** ElevenLabs style exaggeration (0–1) */
  style?: number;
}

/** Request body for POST /api/tts/synthesize */
export interface TtsSynthesizeRequest {
  messageId: string;
  text: string;
  characterId: string;
  provider: TtsProviderType;
  voice: string;
  emotion?: string | null;
  settings?: TtsSettings;
}

/** OpenAI TTS voices */
export const OPENAI_TTS_VOICES = [
  "alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer",
] as const;

export type OpenAiTtsVoice = typeof OPENAI_TTS_VOICES[number];

/** OpenAI TTS models */
export const OPENAI_TTS_MODELS = ["tts-1", "tts-1-hd", "gpt-4o-mini-tts"] as const;

export type OpenAiTtsModel = typeof OPENAI_TTS_MODELS[number];
