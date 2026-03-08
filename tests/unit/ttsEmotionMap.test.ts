import { describe, it, expect } from "vitest";
import { DEFAULT_EXPRESSIONS } from "../../src/shared/expression-types";
import { EMOTION_TTS_MAP, getEmotionParams } from "../../src/shared/tts-emotion-map";

describe("EMOTION_TTS_MAP", () => {
  it("has an entry for every default expression", () => {
    for (const expr of DEFAULT_EXPRESSIONS) {
      expect(EMOTION_TTS_MAP).toHaveProperty(expr);
    }
  });

  it("each entry has all required fields", () => {
    for (const expr of DEFAULT_EXPRESSIONS) {
      const params = EMOTION_TTS_MAP[expr];
      expect(params.openaiInstruction).toBeTypeOf("string");
      expect(params.openaiInstruction.length).toBeGreaterThan(0);
      expect(params.elevenlabsStability).toBeTypeOf("number");
      expect(params.elevenlabsSimilarityBoost).toBeTypeOf("number");
      expect(params.elevenlabsStyle).toBeTypeOf("number");
      expect(params.systemPitch).toBeTypeOf("number");
      expect(params.systemRate).toBeTypeOf("number");
    }
  });

  it("ElevenLabs values are in 0–1 range", () => {
    for (const expr of DEFAULT_EXPRESSIONS) {
      const p = EMOTION_TTS_MAP[expr];
      expect(p.elevenlabsStability).toBeGreaterThanOrEqual(0);
      expect(p.elevenlabsStability).toBeLessThanOrEqual(1);
      expect(p.elevenlabsSimilarityBoost).toBeGreaterThanOrEqual(0);
      expect(p.elevenlabsSimilarityBoost).toBeLessThanOrEqual(1);
      expect(p.elevenlabsStyle).toBeGreaterThanOrEqual(0);
      expect(p.elevenlabsStyle).toBeLessThanOrEqual(1);
    }
  });

  it("system pitch and rate are in reasonable range (0.5–2.0)", () => {
    for (const expr of DEFAULT_EXPRESSIONS) {
      const p = EMOTION_TTS_MAP[expr];
      expect(p.systemPitch).toBeGreaterThanOrEqual(0.5);
      expect(p.systemPitch).toBeLessThanOrEqual(2.0);
      expect(p.systemRate).toBeGreaterThanOrEqual(0.5);
      expect(p.systemRate).toBeLessThanOrEqual(2.0);
    }
  });
});

describe("getEmotionParams", () => {
  it("returns correct params for joy (high energy positive)", () => {
    const params = getEmotionParams("joy");
    expect(params.openaiInstruction).toContain("happiness");
    expect(params.elevenlabsStability).toBe(0.3);
    expect(params.elevenlabsStyle).toBe(0.8);
    expect(params.systemPitch).toBe(1.3);
    expect(params.systemRate).toBe(1.15);
  });

  it("returns correct params for neutral", () => {
    const params = getEmotionParams("neutral");
    expect(params.openaiInstruction).toContain("natural");
    expect(params.elevenlabsStability).toBe(0.5);
    expect(params.elevenlabsStyle).toBe(0.0);
    expect(params.systemPitch).toBe(1.0);
    expect(params.systemRate).toBe(1.0);
  });

  it("returns correct params for anger (negative high energy)", () => {
    const params = getEmotionParams("anger");
    expect(params.openaiInstruction).toContain("anger");
    expect(params.elevenlabsStability).toBe(0.2);
    expect(params.elevenlabsStyle).toBe(0.9);
    expect(params.systemPitch).toBe(0.9);
    expect(params.systemRate).toBe(1.1);
  });

  it("returns correct params for sadness (negative low energy)", () => {
    const params = getEmotionParams("sadness");
    expect(params.elevenlabsStability).toBe(0.8);
    expect(params.elevenlabsStyle).toBe(0.1);
    expect(params.systemPitch).toBe(0.8);
    expect(params.systemRate).toBe(0.85);
  });

  it("falls back to neutral for null", () => {
    const params = getEmotionParams(null);
    expect(params).toEqual(EMOTION_TTS_MAP.neutral);
  });

  it("falls back to neutral for undefined", () => {
    const params = getEmotionParams(undefined);
    expect(params).toEqual(EMOTION_TTS_MAP.neutral);
  });

  it("falls back to neutral for unknown expression", () => {
    const params = getEmotionParams("nonexistent");
    expect(params).toEqual(EMOTION_TTS_MAP.neutral);
  });

  it("falls back to neutral for empty string", () => {
    const params = getEmotionParams("");
    expect(params).toEqual(EMOTION_TTS_MAP.neutral);
  });
});
