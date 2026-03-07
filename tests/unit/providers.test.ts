import { describe, it, expect } from "vitest";
import {
  buildProviderUrl,
  buildProviderHeaders,
  buildProviderRequestBody,
  parseStreamLine,
  type ProviderMessage,
  type ProviderPreset,
} from "../../src/main/server/lib/providers";

const BASE = "http://localhost:11434";

const PRESET: ProviderPreset = {
  temperature: 0.8,
  topP: 0.95,
  topPEnabled: true,
  topK: 40,
  topKEnabled: false,
  repetitionPenalty: 1.1,
  maxNewTokens: 256,
  stopSequences: ["<|end|>"],
};

const MESSAGES: ProviderMessage[] = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello!" },
  { role: "assistant", content: "Hi there!" },
];

// ── buildProviderUrl ────────────────────────────────────────────────────────

describe("buildProviderUrl", () => {
  it("routes ollama to /api/chat", () => {
    expect(buildProviderUrl("ollama", BASE)).toBe(`${BASE}/api/chat`);
  });

  it("routes anthropic to /v1/messages", () => {
    expect(buildProviderUrl("anthropic", "https://api.anthropic.com")).toBe(
      "https://api.anthropic.com/v1/messages"
    );
  });

  it("routes openai to /v1/chat/completions", () => {
    expect(buildProviderUrl("openai", "https://api.openai.com")).toBe(
      "https://api.openai.com/v1/chat/completions"
    );
  });

  it("routes groq to /v1/chat/completions", () => {
    expect(buildProviderUrl("groq", "https://api.groq.com/openai")).toBe(
      "https://api.groq.com/openai/v1/chat/completions"
    );
  });

  it("routes lm-studio to /v1/chat/completions", () => {
    expect(buildProviderUrl("lm-studio", "http://localhost:1234")).toBe(
      "http://localhost:1234/v1/chat/completions"
    );
  });

  it("strips trailing slashes from the endpoint", () => {
    expect(buildProviderUrl("ollama", "http://localhost:11434//")).toBe(
      "http://localhost:11434/api/chat"
    );
  });
});

// ── buildProviderHeaders ────────────────────────────────────────────────────

describe("buildProviderHeaders", () => {
  it("ollama returns only Content-Type", () => {
    const h = buildProviderHeaders("ollama", null);
    expect(h["Content-Type"]).toBe("application/json");
    expect(h["Authorization"]).toBeUndefined();
  });

  it("openai sets Authorization Bearer header", () => {
    const h = buildProviderHeaders("openai", "sk-test123");
    expect(h["Authorization"]).toBe("Bearer sk-test123");
  });

  it("groq sets Authorization Bearer header", () => {
    const h = buildProviderHeaders("groq", "gsk_abc");
    expect(h["Authorization"]).toBe("Bearer gsk_abc");
  });

  it("lm-studio with no key has no Authorization", () => {
    const h = buildProviderHeaders("lm-studio", null);
    expect(h["Authorization"]).toBeUndefined();
  });

  it("anthropic sets x-api-key and anthropic-version", () => {
    const h = buildProviderHeaders("anthropic", "ant-key");
    expect(h["x-api-key"]).toBe("ant-key");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    expect(h["Authorization"]).toBeUndefined();
  });

  it("anthropic still sets anthropic-version when apiKey is null", () => {
    const h = buildProviderHeaders("anthropic", null);
    expect(h["anthropic-version"]).toBe("2023-06-01");
    expect(h["x-api-key"]).toBeUndefined();
  });
});

// ── buildProviderRequestBody ────────────────────────────────────────────────

describe("buildProviderRequestBody (ollama)", () => {
  it("produces nested options block", () => {
    const body = buildProviderRequestBody("ollama", "llama3", MESSAGES, PRESET) as Record<string, unknown>;
    expect(body.model).toBe("llama3");
    expect(body.stream).toBe(true);
    expect(body.messages).toBe(MESSAGES);
    const opts = body.options as Record<string, unknown>;
    expect(opts.temperature).toBe(0.8);
    expect(opts.top_p).toBe(0.95);
    expect(opts.top_k).toBeUndefined(); // topKEnabled is false
    expect(opts.repeat_penalty).toBe(1.1);
    expect(opts.num_predict).toBe(256);
    expect(opts.stop).toEqual(["<|end|>"]);
  });

  it("omits stop when stopSequences is empty", () => {
    const preset = { ...PRESET, stopSequences: [] };
    const body = buildProviderRequestBody("ollama", "llama3", MESSAGES, preset) as Record<string, unknown>;
    const opts = body.options as Record<string, unknown>;
    expect(opts.stop).toBeUndefined();
  });

  it("uses defaults when preset is null", () => {
    const body = buildProviderRequestBody("ollama", "llama3", MESSAGES, null) as Record<string, unknown>;
    const opts = body.options as Record<string, unknown>;
    expect(opts.temperature).toBe(0.8);
    expect(opts.num_predict).toBe(512);
  });
});

describe("buildProviderRequestBody (openai / groq / lm-studio)", () => {
  it("produces flat body with max_tokens", () => {
    const body = buildProviderRequestBody("openai", "gpt-4o", MESSAGES, PRESET) as Record<string, unknown>;
    expect(body.model).toBe("gpt-4o");
    expect(body.stream).toBe(true);
    expect(body.messages).toBe(MESSAGES);
    expect(body.temperature).toBe(0.8);
    expect(body.max_tokens).toBe(256);
    expect(body.top_p).toBe(0.95);
    expect(body.stop).toEqual(["<|end|>"]);
    expect(body.options).toBeUndefined();
  });

  it("omits top_p when topPEnabled is false", () => {
    const preset = { ...PRESET, topPEnabled: false };
    const body = buildProviderRequestBody("openai", "gpt-4o", MESSAGES, preset) as Record<string, unknown>;
    expect(body.top_p).toBeUndefined();
  });

  it("groq uses same format as openai", () => {
    const body = buildProviderRequestBody("groq", "llama3-8b-8192", MESSAGES, PRESET) as Record<string, unknown>;
    expect(body.max_tokens).toBe(256);
    expect(body.options).toBeUndefined();
  });
});

describe("buildProviderRequestBody (anthropic)", () => {
  it("extracts system messages to top-level system field", () => {
    const body = buildProviderRequestBody("anthropic", "claude-sonnet-4-6", MESSAGES, PRESET) as Record<string, unknown>;
    expect(body.system).toBe("You are a helpful assistant.");
    const msgs = body.messages as Array<{ role: string; content: string }>;
    expect(msgs.every((m) => m.role !== "system")).toBe(true);
  });

  it("keeps user and assistant messages", () => {
    const body = buildProviderRequestBody("anthropic", "claude-sonnet-4-6", MESSAGES, PRESET) as Record<string, unknown>;
    const msgs = body.messages as Array<{ role: string; content: string }>;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ role: "user", content: "Hello!" });
    expect(msgs[1]).toEqual({ role: "assistant", content: "Hi there!" });
  });

  it("merges consecutive same-role messages", () => {
    const msgs: ProviderMessage[] = [
      { role: "system", content: "sys1" },
      { role: "user", content: "a" },
      { role: "user", content: "b" },
      { role: "assistant", content: "c" },
    ];
    const body = buildProviderRequestBody("anthropic", "claude-sonnet-4-6", msgs, PRESET) as Record<string, unknown>;
    const out = body.messages as Array<{ role: string; content: string }>;
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ role: "user", content: "a\nb" });
  });

  it("omits system field when there are no system messages", () => {
    const msgs: ProviderMessage[] = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ];
    const body = buildProviderRequestBody("anthropic", "claude-haiku-4-5-20251001", msgs, PRESET) as Record<string, unknown>;
    expect(body.system).toBeUndefined();
  });

  it("uses max_tokens not num_predict", () => {
    const body = buildProviderRequestBody("anthropic", "claude-sonnet-4-6", MESSAGES, PRESET) as Record<string, unknown>;
    expect(body.max_tokens).toBe(256);
    expect(body.options).toBeUndefined();
  });

  it("concatenates multiple system messages with double newline", () => {
    const msgs: ProviderMessage[] = [
      { role: "system", content: "Part 1" },
      { role: "system", content: "Part 2" },
      { role: "user", content: "Hi" },
    ];
    const body = buildProviderRequestBody("anthropic", "claude-sonnet-4-6", msgs, PRESET) as Record<string, unknown>;
    expect(body.system).toBe("Part 1\n\nPart 2");
  });
});

// ── parseStreamLine ─────────────────────────────────────────────────────────

describe("parseStreamLine (ollama)", () => {
  it("extracts token from message.content", () => {
    const line = JSON.stringify({ message: { content: "Hello" }, done: false });
    expect(parseStreamLine("ollama", line)).toEqual({ text: "Hello" });
  });

  it("returns done when done is true", () => {
    const line = JSON.stringify({ done: true });
    expect(parseStreamLine("ollama", line)).toEqual({ done: true });
  });

  it("returns null for empty/whitespace lines", () => {
    expect(parseStreamLine("ollama", "")).toBeNull();
    expect(parseStreamLine("ollama", "   ")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseStreamLine("ollama", "{bad json")).toBeNull();
  });

  it("returns null when content is missing", () => {
    const line = JSON.stringify({ message: {}, done: false });
    expect(parseStreamLine("ollama", line)).toBeNull();
  });
});

describe("parseStreamLine (openai)", () => {
  it("extracts token from choices[0].delta.content", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: " world" }, finish_reason: null }] })}`;
    expect(parseStreamLine("openai", line)).toEqual({ text: " world" });
  });

  it("returns done on [DONE]", () => {
    expect(parseStreamLine("openai", "data: [DONE]")).toEqual({ done: true });
  });

  it("returns done when finish_reason is set", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}`;
    expect(parseStreamLine("openai", line)).toEqual({ done: true });
  });

  it("returns null for non-data lines", () => {
    expect(parseStreamLine("openai", "event: ping")).toBeNull();
    expect(parseStreamLine("openai", ": keep-alive")).toBeNull();
  });

  it("returns null when delta.content is absent", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: null }] })}`;
    expect(parseStreamLine("openai", line)).toBeNull();
  });
});

describe("parseStreamLine (groq)", () => {
  it("uses same OpenAI format", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "test" }, finish_reason: null }] })}`;
    expect(parseStreamLine("groq", line)).toEqual({ text: "test" });
  });
});

describe("parseStreamLine (anthropic)", () => {
  it("extracts text from content_block_delta", () => {
    const line = `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } })}`;
    expect(parseStreamLine("anthropic", line)).toEqual({ text: "Hello" });
  });

  it("returns done on message_stop", () => {
    const line = `data: ${JSON.stringify({ type: "message_stop" })}`;
    expect(parseStreamLine("anthropic", line)).toEqual({ done: true });
  });

  it("returns null for other event types (message_start, etc.)", () => {
    const line = `data: ${JSON.stringify({ type: "message_start", message: {} })}`;
    expect(parseStreamLine("anthropic", line)).toBeNull();
  });

  it("returns null when delta has no text", () => {
    const line = `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta" } })}`;
    expect(parseStreamLine("anthropic", line)).toBeNull();
  });

  it("returns done on [DONE]", () => {
    expect(parseStreamLine("anthropic", "data: [DONE]")).toEqual({ done: true });
  });
});
