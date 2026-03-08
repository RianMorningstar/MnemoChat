import type { Expression } from "./expression-types";

/**
 * Per-provider TTS parameters derived from a classified expression.
 * Used to modulate voice tone/style based on the emotion of the message.
 */
export interface EmotionTtsParams {
  /** Instruction text for OpenAI gpt-4o-mini-tts model */
  openaiInstruction: string;
  /** ElevenLabs voice_settings overrides */
  elevenlabsStability: number;
  elevenlabsSimilarityBoost: number;
  elevenlabsStyle: number;
  /** Web Speech API utterance overrides */
  systemPitch: number;
  systemRate: number;
}

// Group definitions to avoid repetition
const HIGH_ENERGY_POSITIVE: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.3,
  elevenlabsSimilarityBoost: 0.8,
  elevenlabsStyle: 0.8,
  systemPitch: 1.3,
  systemRate: 1.15,
};

const WARM_POSITIVE: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.5,
  elevenlabsSimilarityBoost: 0.75,
  elevenlabsStyle: 0.5,
  systemPitch: 1.1,
  systemRate: 1.0,
};

const CALM_POSITIVE: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.7,
  elevenlabsSimilarityBoost: 0.75,
  elevenlabsStyle: 0.2,
  systemPitch: 1.0,
  systemRate: 1.0,
};

const NEUTRAL: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.5,
  elevenlabsSimilarityBoost: 0.75,
  elevenlabsStyle: 0.0,
  systemPitch: 1.0,
  systemRate: 1.0,
};

const UNCERTAIN: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.4,
  elevenlabsSimilarityBoost: 0.7,
  elevenlabsStyle: 0.4,
  systemPitch: 1.05,
  systemRate: 0.95,
};

const NEGATIVE_LOW: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.8,
  elevenlabsSimilarityBoost: 0.8,
  elevenlabsStyle: 0.1,
  systemPitch: 0.8,
  systemRate: 0.85,
};

const NEGATIVE_HIGH: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.2,
  elevenlabsSimilarityBoost: 0.7,
  elevenlabsStyle: 0.9,
  systemPitch: 0.9,
  systemRate: 1.1,
};

const SURPRISE: Omit<EmotionTtsParams, "openaiInstruction"> = {
  elevenlabsStability: 0.3,
  elevenlabsSimilarityBoost: 0.75,
  elevenlabsStyle: 0.6,
  systemPitch: 1.2,
  systemRate: 1.1,
};

export const EMOTION_TTS_MAP: Record<Expression, EmotionTtsParams> = {
  // High Energy Positive
  joy: { openaiInstruction: "Speak with genuine happiness and warmth in your voice", ...HIGH_ENERGY_POSITIVE },
  excitement: { openaiInstruction: "Speak with excited energy and enthusiasm", ...HIGH_ENERGY_POSITIVE },
  amusement: { openaiInstruction: "Speak with a light, amused tone as if finding something funny", ...HIGH_ENERGY_POSITIVE },
  pride: { openaiInstruction: "Speak with confident pride and satisfaction", ...HIGH_ENERGY_POSITIVE },

  // Warm Positive
  love: { openaiInstruction: "Speak with deep affection and tenderness", ...WARM_POSITIVE },
  caring: { openaiInstruction: "Speak with gentle concern and warmth", ...WARM_POSITIVE },
  gratitude: { openaiInstruction: "Speak with heartfelt thankfulness", ...WARM_POSITIVE },
  admiration: { openaiInstruction: "Speak with respectful admiration and awe", ...WARM_POSITIVE },
  approval: { openaiInstruction: "Speak with an encouraging, approving tone", ...WARM_POSITIVE },

  // Calm Positive
  optimism: { openaiInstruction: "Speak with hopeful optimism and a bright outlook", ...CALM_POSITIVE },
  relief: { openaiInstruction: "Speak with relieved calm, as if a weight has been lifted", ...CALM_POSITIVE },
  realization: { openaiInstruction: "Speak with the tone of sudden understanding and clarity", ...CALM_POSITIVE },

  // Neutral
  neutral: { openaiInstruction: "Speak in a natural, conversational tone", ...NEUTRAL },

  // Uncertain
  confusion: { openaiInstruction: "Speak with a puzzled, uncertain tone", ...UNCERTAIN },
  curiosity: { openaiInstruction: "Speak with inquisitive curiosity and interest", ...UNCERTAIN },
  nervousness: { openaiInstruction: "Speak with slight nervousness and hesitation", ...UNCERTAIN },
  embarrassment: { openaiInstruction: "Speak with a flustered, self-conscious tone", ...UNCERTAIN },

  // Negative Low Energy
  sadness: { openaiInstruction: "Speak with a somber, melancholy tone", ...NEGATIVE_LOW },
  grief: { openaiInstruction: "Speak with deep sorrow and heaviness", ...NEGATIVE_LOW },
  disappointment: { openaiInstruction: "Speak with quiet disappointment and letdown", ...NEGATIVE_LOW },
  remorse: { openaiInstruction: "Speak with regretful remorse and guilt", ...NEGATIVE_LOW },

  // Negative High Energy
  anger: { openaiInstruction: "Speak with firm intensity and controlled anger", ...NEGATIVE_HIGH },
  annoyance: { openaiInstruction: "Speak with irritation and impatience", ...NEGATIVE_HIGH },
  disapproval: { openaiInstruction: "Speak with a disapproving, critical tone", ...NEGATIVE_HIGH },
  disgust: { openaiInstruction: "Speak with revulsion and strong distaste", ...NEGATIVE_HIGH },

  // Surprise / Misc
  surprise: { openaiInstruction: "Speak with genuine surprise and astonishment", ...SURPRISE },
  fear: { openaiInstruction: "Speak with urgency and fearful tension", ...SURPRISE },
  desire: { openaiInstruction: "Speak with longing and passionate yearning", ...SURPRISE },
};

/** Get emotion TTS params, falling back to neutral if expression is unknown */
export function getEmotionParams(expression: string | null | undefined): EmotionTtsParams {
  if (!expression) return EMOTION_TTS_MAP.neutral;
  return EMOTION_TTS_MAP[expression as Expression] ?? EMOTION_TTS_MAP.neutral;
}
