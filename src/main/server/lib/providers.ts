import type { ProviderType } from "../../../shared/types";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderPreset {
  temperature: number | null;
  topP: number | null;
  topPEnabled: boolean;
  topK: number | null;
  topKEnabled: boolean;
  repetitionPenalty: number | null;
  maxNewTokens: number | null;
  stopSequences: string[];
  negativePrompt: string | null;
  guidanceScale: number | null;
}

export function buildProviderUrl(type: ProviderType, endpoint: string, model?: string): string {
  const base = endpoint.replace(/\/+$/, "");
  switch (type) {
    case "ollama":
      return `${base}/api/chat`;
    case "anthropic":
      return `${base}/v1/messages`;
    case "gemini":
      return `${base}/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    case "openrouter":
    case "mistral":
    case "openai":
    case "lm-studio":
    case "groq":
    default:
      return `${base}/v1/chat/completions`;
  }
}

export function buildProviderHeaders(
  type: ProviderType,
  apiKey: string | null
): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  switch (type) {
    case "openrouter":
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      headers["HTTP-Referer"] = "https://mnemochat.app";
      headers["X-Title"] = "MnemoChat";
      break;
    case "gemini":
      if (apiKey) headers["x-goog-api-key"] = apiKey;
      break;
    case "mistral":
    case "openai":
    case "lm-studio":
    case "groq":
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      break;
    case "anthropic":
      if (apiKey) headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
  }
  return headers;
}

export function buildProviderRequestBody(
  type: ProviderType,
  model: string,
  messages: ProviderMessage[],
  preset: ProviderPreset | null,
  stream = true,
): unknown {
  const temperature = preset?.temperature ?? 0.8;
  const maxTokens = preset?.maxNewTokens ?? 512;
  const stops = preset?.stopSequences ?? [];

  switch (type) {
    case "ollama": {
      const options: Record<string, unknown> = { temperature };
      if (preset?.topPEnabled && preset.topP != null) options.top_p = preset.topP;
      if (preset?.topKEnabled && preset.topK != null) options.top_k = preset.topK;
      if (preset?.repetitionPenalty != null) options.repeat_penalty = preset.repetitionPenalty;
      options.num_predict = maxTokens;
      if (stops.length > 0) options.stop = stops;
      return { model, messages, stream, options };
    }

    case "anthropic": {
      // Concatenate all system messages into the top-level system field.
      // Merge consecutive same-role messages to satisfy Anthropic's alternating requirement.
      const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
      const nonSystem = messages.filter((m) => m.role !== "system");
      const merged: { role: "user" | "assistant"; content: string }[] = [];
      for (const m of nonSystem) {
        const last = merged[merged.length - 1];
        if (last && last.role === m.role) {
          last.content += "\n" + m.content;
        } else {
          merged.push({ role: m.role as "user" | "assistant", content: m.content });
        }
      }
      const body: Record<string, unknown> = {
        model,
        messages: merged,
        stream,
        max_tokens: maxTokens,
        temperature,
      };
      if (systemParts.length > 0) body.system = systemParts.join("\n\n");
      return body;
    }

    case "gemini": {
      const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
      const nonSystem = messages.filter((m) => m.role !== "system");
      const merged: { role: "user" | "model"; parts: { text: string }[] }[] = [];
      for (const m of nonSystem) {
        const geminiRole = m.role === "assistant" ? "model" : "user";
        const last = merged[merged.length - 1];
        if (last && last.role === geminiRole) {
          last.parts[0].text += "\n" + m.content;
        } else {
          merged.push({ role: geminiRole as "user" | "model", parts: [{ text: m.content }] });
        }
      }
      const body: Record<string, unknown> = {
        contents: merged,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(preset?.topPEnabled && preset.topP != null ? { topP: preset.topP } : {}),
          ...(preset?.topKEnabled && preset.topK != null ? { topK: preset.topK } : {}),
          ...(stops.length > 0 ? { stopSequences: stops } : {}),
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      };
      if (systemParts.length > 0) {
        body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
      }
      return body;
    }

    case "openrouter":
    case "mistral":
    case "openai":
    case "lm-studio":
    case "groq":
    default: {
      const body: Record<string, unknown> = {
        model,
        messages,
        stream,
        temperature,
        max_tokens: maxTokens,
      };
      if (preset?.topPEnabled && preset.topP != null) body.top_p = preset.topP;
      if (stops.length > 0) body.stop = stops;
      return body;
    }
  }
}

/**
 * Parse a single line from the provider's streaming response.
 * Returns { text } for a content delta, { done: true } to signal end, or null to skip.
 */
export function parseStreamLine(
  type: ProviderType,
  line: string
): { text?: string; done?: boolean } | null {
  if (!line.trim()) return null;

  if (type === "ollama") {
    try {
      const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
      if (chunk.done) return { done: true };
      return chunk.message?.content ? { text: chunk.message.content } : null;
    } catch {
      return null;
    }
  }

  // SSE format: "data: {...}" or "data: [DONE]"
  if (!line.startsWith("data:")) return null;
  const raw = line.slice(5).trim();
  if (raw === "[DONE]") return { done: true };

  try {
    const chunk = JSON.parse(raw) as Record<string, unknown>;

    if (type === "anthropic") {
      if ((chunk.type as string) === "message_stop") return { done: true };
      if ((chunk.type as string) === "content_block_delta") {
        const delta = chunk.delta as { type?: string; text?: string } | undefined;
        return delta?.text ? { text: delta.text } : null;
      }
      return null;
    }

    if (type === "gemini") {
      const candidates = chunk.candidates as
        | Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>
        | undefined;
      if (!candidates?.[0]) return null;
      if (candidates[0].finishReason) return { done: true };
      const text = candidates[0].content?.parts?.[0]?.text;
      return text ? { text } : null;
    }

    // OpenAI / Groq / LM Studio / OpenRouter / Mistral
    const choices = chunk.choices as
      | Array<{ delta?: { content?: string }; finish_reason?: string | null }>
      | undefined;
    if (!choices?.[0]) return null;
    if (choices[0].finish_reason) return { done: true };
    return choices[0].delta?.content ? { text: choices[0].delta.content } : null;
  } catch {
    return null;
  }
}

/**
 * Build a non-streaming URL for a provider.
 * Most providers use the same URL; Gemini needs a different endpoint.
 */
export function buildProviderSyncUrl(type: ProviderType, endpoint: string, model?: string): string {
  if (type === "gemini") {
    const base = endpoint.replace(/\/+$/, "");
    return `${base}/v1beta/models/${model}:generateContent`;
  }
  return buildProviderUrl(type, endpoint, model);
}

/**
 * Extract text content from a non-streaming provider response body.
 */
export function parseNonStreamingResponse(type: ProviderType, body: unknown): string | null {
  const data = body as Record<string, unknown>;

  if (type === "ollama") {
    const msg = (data.message as { content?: string }) || {};
    return msg.content?.trim() || null;
  }

  if (type === "anthropic") {
    const content = data.content as Array<{ type: string; text?: string }> | undefined;
    return content?.[0]?.text?.trim() || null;
  }

  if (type === "gemini") {
    const candidates = data.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    return candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  // OpenAI / Groq / LM Studio / OpenRouter / Mistral
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content?.trim() || null;
}
