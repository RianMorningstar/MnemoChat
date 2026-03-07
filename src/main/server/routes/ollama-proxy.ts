import type { FastifyInstance } from "fastify";
import type { ProviderType } from "../../../shared/types";

// Hardcoded Anthropic models (no public list endpoint)
const ANTHROPIC_MODELS = [
  { name: "claude-opus-4-6", size: 0, details: { family: "claude", parameter_size: "Cloud" } },
  { name: "claude-sonnet-4-6", size: 0, details: { family: "claude", parameter_size: "Cloud" } },
  { name: "claude-haiku-4-5-20251001", size: 0, details: { family: "claude", parameter_size: "Cloud" } },
  { name: "claude-opus-4-5", size: 0, details: { family: "claude", parameter_size: "Cloud" } },
  { name: "claude-sonnet-4-5", size: 0, details: { family: "claude", parameter_size: "Cloud" } },
];

function bearerHeaders(apiKey: string | undefined): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export async function ollamaProxyRoutes(app: FastifyInstance) {
  app.post<{ Body: { endpoint: string; type?: string; apiKey?: string } }>(
    "/api/ollama/health",
    async (request) => {
      const { endpoint, type = "ollama", apiKey } = request.body;
      const providerType = type as ProviderType;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        let res: Response;
        if (providerType === "ollama") {
          res = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
        } else if (providerType === "anthropic") {
          res = await fetch(`${endpoint}/v1/models`, {
            headers: { "x-api-key": apiKey || "", "anthropic-version": "2023-06-01" },
            signal: controller.signal,
          });
        } else if (providerType === "gemini") {
          res = await fetch(`${endpoint}/v1beta/models`, {
            headers: { "x-goog-api-key": apiKey || "" },
            signal: controller.signal,
          });
        } else {
          // OpenAI-compatible (openai, groq, lm-studio, openrouter, mistral)
          res = await fetch(`${endpoint}/v1/models`, {
            headers: bearerHeaders(apiKey),
            signal: controller.signal,
          });
        }

        clearTimeout(timeout);
        // Any HTTP response means the endpoint is reachable
        return { ok: res.status < 500 };
      } catch {
        return { ok: false };
      }
    }
  );

  app.post<{ Body: { endpoint: string; type?: string; apiKey?: string } }>(
    "/api/ollama/models",
    async (request) => {
      const { endpoint, type = "ollama", apiKey } = request.body;
      const providerType = type as ProviderType;

      try {
        if (providerType === "anthropic") {
          return { models: ANTHROPIC_MODELS };
        }

        if (providerType === "ollama") {
          const res = await fetch(`${endpoint}/api/tags`);
          if (!res.ok) return { models: [] };
          const data = (await res.json()) as {
            models?: Array<{
              name: string;
              size: number;
              details?: { parameter_size?: string; family?: string; quantization_level?: string };
            }>;
          };
          return { models: data.models || [] };
        }

        if (providerType === "gemini") {
          const res = await fetch(`${endpoint}/v1beta/models`, {
            headers: { "x-goog-api-key": apiKey || "" },
          });
          if (!res.ok) return { models: [] };
          const data = (await res.json()) as {
            models?: Array<{ name: string; displayName?: string }>;
          };
          const models = (data.models || [])
            .filter((m) => m.name.startsWith("models/gemini"))
            .map((m) => ({
              name: m.name.replace(/^models\//, ""),
              size: 0,
              details: { family: "gemini", parameter_size: "Cloud" },
            }));
          return { models };
        }

        // OpenAI-compatible: openai, groq, lm-studio, openrouter, mistral
        const res = await fetch(`${endpoint}/v1/models`, {
          headers: bearerHeaders(apiKey),
        });
        if (!res.ok) return { models: [] };
        const data = (await res.json()) as { data?: Array<{ id: string; owned_by?: string }> };
        const models = (data.data || []).map((m) => ({
          name: m.id,
          size: 0,
          details: { family: m.owned_by || "unknown", parameter_size: "Cloud" },
        }));
        return { models };
      } catch {
        return { models: [] };
      }
    }
  );
}
