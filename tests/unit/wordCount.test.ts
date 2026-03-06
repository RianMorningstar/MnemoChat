import { describe, it, expect } from "vitest";
import { wordCount } from "../../src/main/server/lib/chat-utils";

describe("wordCount", () => {
  it("returns 0 for an empty string", () => {
    expect(wordCount("")).toBe(0);
  });

  it("returns 0 for a whitespace-only string", () => {
    expect(wordCount("   ")).toBe(0);
    expect(wordCount("\t\n")).toBe(0);
  });

  it("returns 1 for a single word", () => {
    expect(wordCount("hello")).toBe(1);
  });

  it("counts multiple space-separated words", () => {
    expect(wordCount("hello world")).toBe(2);
    expect(wordCount("one two three")).toBe(3);
  });

  it("handles extra leading/trailing whitespace", () => {
    expect(wordCount("  hello world  ")).toBe(2);
  });

  it("handles multiple internal spaces", () => {
    expect(wordCount("hello   world")).toBe(2);
  });

  it("counts a realistic sentence correctly", () => {
    const sentence = "The quick brown fox jumps over the lazy dog";
    expect(wordCount(sentence)).toBe(9);
  });
});
