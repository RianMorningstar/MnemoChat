import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  classifyExpression,
  truncateForClassification,
} from "../../src/main/server/lib/expression-classifier";

// ── truncateForClassification ────────────────────────────────────────────────

describe("truncateForClassification", () => {
  it("returns short text as-is (after stripping formatting)", () => {
    expect(truncateForClassification("Hello world!")).toBe("Hello world!");
  });

  it("strips asterisks, backticks, and double quotes", () => {
    expect(truncateForClassification('*bold* "quoted" `code`')).toBe("bold quoted code");
  });

  it("trims whitespace", () => {
    expect(truncateForClassification("  hello  ")).toBe("hello");
  });

  it("returns text under 500 chars without truncation", () => {
    const text = "a".repeat(499);
    expect(truncateForClassification(text)).toBe(text);
  });

  it("returns text of exactly 500 chars without truncation", () => {
    const text = "a".repeat(500);
    expect(truncateForClassification(text)).toBe(text);
  });

  it("truncates text over 500 chars to first 250 + ... + last 250", () => {
    const text = "A".repeat(300) + "B".repeat(300);
    const result = truncateForClassification(text);
    expect(result).toContain(" ... ");
    // First 250 chars are all A's
    expect(result.startsWith("A".repeat(250))).toBe(true);
    // Last 250 chars are all B's
    expect(result.endsWith("B".repeat(250))).toBe(true);
    // Total: 250 + 5 (" ... ") + 250 = 505
    expect(result.length).toBe(505);
  });

  it("handles formatting characters reducing text below 500", () => {
    // 510 chars with 20 asterisks = 490 cleaned chars, under 500
    const text = "*".repeat(20) + "x".repeat(490);
    const result = truncateForClassification(text);
    expect(result).toBe("x".repeat(490));
  });
});

// ── classifyExpression ───────────────────────────────────────────────────────

describe("classifyExpression", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns 'neutral' when availableExpressions is empty", async () => {
    const result = await classifyExpression("Hello!", [], "ollama", "http://localhost:11434", null, "llama3");
    expect(result).toBe("neutral");
    // fetch should not have been called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns matched expression from LLM response (ollama)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "joy" } }),
    });

    const result = await classifyExpression(
      "I'm so happy today!",
      ["joy", "anger", "sadness", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("joy");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns matched expression from LLM response (openai format)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "anger" } }] }),
    });

    const result = await classifyExpression(
      "I'm furious!",
      ["joy", "anger", "sadness"],
      "openai",
      "https://api.openai.com",
      "sk-test",
      "gpt-4o",
    );

    expect(result).toBe("anger");
  });

  it("returns matched expression from LLM response (anthropic format)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "sadness" }] }),
    });

    const result = await classifyExpression(
      "I'm so sad...",
      ["joy", "anger", "sadness"],
      "anthropic",
      "https://api.anthropic.com",
      "ant-key",
      "claude-sonnet-4-6",
    );

    expect(result).toBe("sadness");
  });

  it("returns matched expression from LLM response (gemini format)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "excitement" }] } }],
      }),
    });

    const result = await classifyExpression(
      "This is amazing!",
      ["excitement", "joy", "neutral"],
      "gemini",
      "https://generativelanguage.googleapis.com",
      "goog-key",
      "gemini-pro",
    );

    expect(result).toBe("excitement");
  });

  it("handles LLM returning expression with extra whitespace/punctuation", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "  Joy.  " } }),
    });

    const result = await classifyExpression(
      "Great news!",
      ["joy", "anger", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("joy");
  });

  it("falls back to 'neutral' when LLM returns unrecognized emotion", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "melancholy" } }),
    });

    const result = await classifyExpression(
      "I feel strange",
      ["joy", "anger", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("neutral");
  });

  it("falls back to 'neutral' on HTTP error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await classifyExpression(
      "Hello",
      ["joy", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("neutral");
  });

  it("falls back to 'neutral' on network error", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const result = await classifyExpression(
      "Hello",
      ["joy", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("neutral");
  });

  it("falls back to 'neutral' when LLM returns empty content", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "" } }),
    });

    const result = await classifyExpression(
      "Hello",
      ["joy", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("neutral");
  });

  it("sends request with stream=false", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "joy" } }),
    });

    await classifyExpression(
      "Happy!",
      ["joy", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.stream).toBe(false);
  });

  it("uses gemini sync URL (generateContent, not streamGenerateContent)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "neutral" }] } }],
      }),
    });

    await classifyExpression(
      "Hello",
      ["neutral"],
      "gemini",
      "https://generativelanguage.googleapis.com",
      "key",
      "gemini-pro",
    );

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0] as string;
    expect(url).toContain("generateContent");
    expect(url).not.toContain("streamGenerateContent");
  });

  it("matches expression contained within LLM verbose response", async () => {
    // Some LLMs might say "The emotion is joy" instead of just "joy"
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "The emotion is joy." } }),
    });

    const result = await classifyExpression(
      "I'm happy!",
      ["joy", "anger", "neutral"],
      "ollama",
      "http://localhost:11434",
      null,
      "llama3",
    );

    expect(result).toBe("joy");
  });
});
