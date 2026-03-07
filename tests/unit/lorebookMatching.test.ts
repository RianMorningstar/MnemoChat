import { describe, it, expect } from "vitest";
import { matchLorebookEntries, type LoreEntryForMatching } from "../../src/main/server/lib/chat-utils";

function makeEntry(overrides: Partial<LoreEntryForMatching> = {}): LoreEntryForMatching {
  return {
    id: "e1",
    characterId: "c1",
    lorebookId: null,
    enabled: true,
    keywords: ["dragon"],
    logic: "AND_ANY",
    probability: 100,
    scanDepth: 0,
    content: "Dragons breathe fire.",
    insertionPosition: "before_character",
    priority: 50,
    ...overrides,
  };
}

const msgs = (contents: string[]) =>
  contents.map((content) => ({ role: "user", content }));

describe("matchLorebookEntries", () => {
  it("AND_ANY: triggers when any keyword appears in any message", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon", "castle"] })],
      msgs(["I saw a dragon today", "nothing here"])
    );
    expect(result).toHaveLength(1);
  });

  it("AND_ANY: does not trigger when no keyword appears", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon"] })],
      msgs(["nothing relevant here"])
    );
    expect(result).toHaveLength(0);
  });

  it("AND_ALL: triggers when all keywords each appear in at least one message", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon", "fire"], logic: "AND_ALL" })],
      msgs(["the dragon roars", "fire everywhere"])
    );
    expect(result).toHaveLength(1);
  });

  it("AND_ALL: does not trigger when one keyword is missing", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon", "fire"], logic: "AND_ALL" })],
      msgs(["the dragon roars", "nothing about fire"])
    );
    // "fire" appears in the second message — this should trigger
    // Let's use a keyword that's truly absent
    const result2 = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon", "wizard"], logic: "AND_ALL" })],
      msgs(["the dragon roars", "some other text"])
    );
    expect(result2).toHaveLength(0);
  });

  it("NOT_ANY: triggers when no keyword appears in any message", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon"], logic: "NOT_ANY" })],
      msgs(["peaceful village", "sunny day"])
    );
    expect(result).toHaveLength(1);
  });

  it("NOT_ANY: does not trigger when a keyword is present", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon"], logic: "NOT_ANY" })],
      msgs(["a dragon appeared"])
    );
    expect(result).toHaveLength(0);
  });

  it("NOT_ALL: triggers when at least one keyword is absent", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon", "wizard"], logic: "NOT_ALL" })],
      msgs(["a dragon appeared", "some other text"])
    );
    // "wizard" is absent → NOT_ALL triggers
    expect(result).toHaveLength(1);
  });

  it("NOT_ALL: does not trigger when all keywords are present", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon", "wizard"], logic: "NOT_ALL" })],
      msgs(["a dragon and a wizard appeared"])
    );
    expect(result).toHaveLength(0);
  });

  it("scanDepth=2: keyword in older message does not trigger", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon"], scanDepth: 2 })],
      msgs(["dragon seen long ago", "nothing", "nothing recent"])
    );
    // Only last 2 messages scanned: "nothing" + "nothing recent" — no match
    expect(result).toHaveLength(0);
  });

  it("scanDepth=2: keyword in recent message triggers", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon"], scanDepth: 2 })],
      msgs(["old message", "nothing", "dragon appeared"])
    );
    expect(result).toHaveLength(1);
  });

  it("disabled entry is skipped regardless of keyword match", () => {
    const result = matchLorebookEntries(
      [makeEntry({ enabled: false, keywords: ["dragon"] })],
      msgs(["a dragon appeared"])
    );
    expect(result).toHaveLength(0);
  });

  it("probability=100 always triggers", () => {
    const results = Array.from({ length: 20 }, () =>
      matchLorebookEntries(
        [makeEntry({ keywords: ["dragon"], probability: 100 })],
        msgs(["a dragon appeared"])
      )
    );
    expect(results.every((r) => r.length === 1)).toBe(true);
  });

  it("probability=0 never triggers", () => {
    const results = Array.from({ length: 20 }, () =>
      matchLorebookEntries(
        [makeEntry({ keywords: ["dragon"], probability: 0 })],
        msgs(["a dragon appeared"])
      )
    );
    expect(results.every((r) => r.length === 0)).toBe(true);
  });

  it("sorts triggered entries by priority descending", () => {
    const result = matchLorebookEntries(
      [
        makeEntry({ id: "low", keywords: ["dragon"], priority: 10 }),
        makeEntry({ id: "high", keywords: ["dragon"], priority: 90 }),
        makeEntry({ id: "mid", keywords: ["dragon"], priority: 50 }),
      ],
      msgs(["a dragon appeared"])
    );
    expect(result.map((e) => e.id)).toEqual(["high", "mid", "low"]);
  });

  it("entry with empty keywords is skipped", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: [] })],
      msgs(["anything"])
    );
    expect(result).toHaveLength(0);
  });

  it("entry with null content is skipped", () => {
    const result = matchLorebookEntries(
      [makeEntry({ keywords: ["dragon"], content: null })],
      msgs(["a dragon appeared"])
    );
    expect(result).toHaveLength(0);
  });
});
