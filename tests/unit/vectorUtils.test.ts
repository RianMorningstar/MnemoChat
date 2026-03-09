import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  serializeVector,
  deserializeVector,
  chunkText,
  buildQueryText,
  formatMemoryInjection,
  prepareTextForEmbedding,
} from "../../src/main/server/lib/vector-utils";
import type { VectorSearchResult } from "../../src/shared/vector-memory-types";

// ── cosineSimilarity ──────────────────────────────────

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it("returns 1.0 for parallel vectors of different magnitude", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([5, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  it("returns close to -1.0 for opposite vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([-1, 0, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  it("returns 0 for mismatched lengths", () => {
    const a = new Float32Array([1, 2]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("returns 0 when one vector is all zeros", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("returns 0 when both vectors are all zeros", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([0, 0, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("computes correct similarity for known vectors", () => {
    // cos([1,0,0], [0.9,0.1,0]) should be high (~0.994)
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0.9, 0.1, 0]);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.99);
    expect(sim).toBeLessThan(1.0);
  });
});

// ── serializeVector / deserializeVector ────────────────

describe("serializeVector / deserializeVector", () => {
  it("round-trips a number array through Buffer", () => {
    const original = [0.1, 0.5, -0.3, 1.0, 0.0];
    const buf = serializeVector(original);
    const result = deserializeVector(buf);

    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(result[i]).toBeCloseTo(original[i], 5);
    }
  });

  it("produces a Buffer of correct byte length", () => {
    const vec = [1.0, 2.0, 3.0];
    const buf = serializeVector(vec);
    // Float32 = 4 bytes per element
    expect(buf.byteLength).toBe(vec.length * 4);
  });

  it("handles empty array", () => {
    const buf = serializeVector([]);
    const result = deserializeVector(buf);
    expect(result.length).toBe(0);
  });

  it("preserves negative values", () => {
    const original = [-1.5, -0.001, -999.9];
    const buf = serializeVector(original);
    const result = deserializeVector(buf);
    for (let i = 0; i < original.length; i++) {
      expect(result[i]).toBeCloseTo(original[i], 2);
    }
  });
});

// ── chunkText ─────────────────────────────────────────

describe("chunkText", () => {
  it("returns single chunk for short text", () => {
    const text = "Hello world.";
    const chunks = chunkText(text, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello world.");
  });

  it("splits long text into multiple chunks", () => {
    const text = "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.";
    const chunks = chunkText(text, 40);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("respects maxChunkSize limit", () => {
    const text = "A very long sentence here. Another sentence follows. And yet another one. Plus one more for good measure.";
    const chunks = chunkText(text, 50);
    // Each chunk should be roughly within the limit (sentence boundaries may cause slight overrun)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThan(100); // generous upper bound
    }
  });

  it("returns at least one chunk for non-empty text", () => {
    const text = "Hello";
    expect(chunkText(text, 3).length).toBeGreaterThanOrEqual(1);
  });

  it("handles text without sentence-ending punctuation", () => {
    const text = "a".repeat(100);
    const chunks = chunkText(text, 30);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // All original content should be preserved
    expect(chunks.join("").length).toBeGreaterThanOrEqual(text.length);
  });

  it("returns empty array for empty string", () => {
    expect(chunkText("", 100)).toHaveLength(0);
  });
});

// ── buildQueryText ────────────────────────────────────

describe("buildQueryText", () => {
  const messages = [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Tell me about dragons." },
    { role: "assistant", content: "Dragons are mythical creatures." },
    { role: "user", content: "What about castles?" },
    { role: "assistant", content: "Castles are fortified structures." },
    { role: "user", content: "Combine them." },
  ];

  it("extracts last N user messages only", () => {
    const result = buildQueryText(messages, 2);
    expect(result).toContain("What about castles?");
    expect(result).toContain("Combine them.");
    expect(result).not.toContain("Tell me about dragons.");
  });

  it("skips assistant and system messages", () => {
    const result = buildQueryText(messages, 10);
    expect(result).not.toContain("Dragons are mythical");
    expect(result).not.toContain("You are helpful");
  });

  it("respects queryDepth parameter", () => {
    const result = buildQueryText(messages, 1);
    expect(result).toBe("Combine them.");
  });

  it("returns empty string when no user messages", () => {
    const noUser = [
      { role: "system", content: "System prompt" },
      { role: "assistant", content: "Hello!" },
    ];
    expect(buildQueryText(noUser, 5)).toBe("");
  });

  it("joins multiple user messages with newline", () => {
    const result = buildQueryText(messages, 3);
    expect(result.split("\n")).toHaveLength(3);
  });
});

// ── formatMemoryInjection ─────────────────────────────

describe("formatMemoryInjection", () => {
  const results: VectorSearchResult[] = [
    { messageId: "m1", content: "I saw a dragon.", role: "user", score: 0.95, timestamp: "2024-01-01" },
    { messageId: "m2", content: "The dragon breathed fire.", role: "assistant", score: 0.85, timestamp: "2024-01-02" },
  ];

  it("replaces {{text}} in template with formatted memories", () => {
    const template = "[Past events:\n{{text}}]";
    const result = formatMemoryInjection(results, template);
    expect(result).toContain("[Past events:");
    expect(result).toContain("I saw a dragon.");
    expect(result).toContain("The dragon breathed fire.");
    expect(result).toContain("]");
  });

  it("prefixes each result with its role", () => {
    const result = formatMemoryInjection(results, "{{text}}");
    expect(result).toContain("[user] I saw a dragon.");
    expect(result).toContain("[assistant] The dragon breathed fire.");
  });

  it("handles empty results array", () => {
    const result = formatMemoryInjection([], "Memories: {{text}}");
    expect(result).toBe("Memories: ");
  });

  it("preserves template text around {{text}}", () => {
    const result = formatMemoryInjection(results, "START {{text}} END");
    expect(result).toMatch(/^START /);
    expect(result).toMatch(/ END$/);
  });
});

// ── prepareTextForEmbedding ───────────────────────────

describe("prepareTextForEmbedding", () => {
  it("prepends role in brackets", () => {
    expect(prepareTextForEmbedding("assistant", "Hello world")).toBe("[assistant] Hello world");
  });

  it("works with user role", () => {
    expect(prepareTextForEmbedding("user", "My question")).toBe("[user] My question");
  });

  it("works with system role", () => {
    expect(prepareTextForEmbedding("system", "Instructions")).toBe("[system] Instructions");
  });
});
