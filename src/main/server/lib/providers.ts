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
}

export function buildProviderUrl(type: ProviderType, endpoint: string): string {
  const base = endpoint.replace(/\/+$/, "");
  switch (type) {
    case "ollama":
      return `${base}/api/chat`;
    case "anthropic":
      return `${base}/v1/messages`;
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
  preset: ProviderPreset | null
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
      return { model, messages, stream: true, options };
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
        stream: true,
        max_tokens: maxTokens,
        temperature,
      };
      if (systemParts.length > 0) body.system = systemParts.join("\n\n");
      return body;
    }

    case "openai":
    case "lm-studio":
    case "groq":
    default: {
      const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
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

  // SSE format: "data: {...}" or "data: [DONE]" (OpenAI / Groq / LM Studio / Anthropic)
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

    // OpenAI / Groq / LM Studio
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
