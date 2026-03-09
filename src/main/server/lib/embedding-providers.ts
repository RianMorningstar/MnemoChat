/**
 * Embedding provider adapters for vector memory.
 * Supports local (HuggingFace Transformers), Ollama, and OpenAI.
 */

import type { EmbeddingProviderType } from "../../../shared/vector-memory-types";

export interface EmbeddingConfig {
  provider: EmbeddingProviderType;
  model: string;
  endpoint?: string;
  apiKey?: string;
}

// ── Local (HuggingFace Transformers) ──────────────────

// Lazy-loaded pipeline singleton
let localPipeline: any = null;
let localModelName: string | null = null;

async function getLocalPipeline(model: string) {
  if (localPipeline && localModelName === model) return localPipeline;

  // Dynamic import — @huggingface/transformers uses ONNX WASM backend
  const { pipeline } = await import("@huggingface/transformers");
  localPipeline = await pipeline("feature-extraction", model, {
    dtype: "fp32",
  });
  localModelName = model;
  return localPipeline;
}

async function getLocalEmbedding(text: string, model: string): Promise<number[]> {
  const pipe = await getLocalPipeline(model);
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// ── Ollama ────────────────────────────────────────────

async function getOllamaEmbedding(
  text: string,
  endpoint: string,
  model: string
): Promise<number[]> {
  const url = `${endpoint.replace(/\/+$/, "")}/api/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: text, model }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama embedding error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.embedding as number[];
}

// ── OpenAI ────────────────────────────────────────────

async function getOpenAIEmbedding(
  text: string,
  apiKey: string,
  model: string
): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embedding error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

// ── Dispatcher ────────────────────────────────────────

/** Get embedding for a single text string. */
export async function getEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  switch (config.provider) {
    case "local":
      return getLocalEmbedding(text, config.model);
    case "ollama":
      if (!config.endpoint) throw new Error("Ollama endpoint required for embeddings");
      return getOllamaEmbedding(text, config.endpoint, config.model);
    case "openai":
      if (!config.apiKey) throw new Error("OpenAI API key required for embeddings");
      return getOpenAIEmbedding(text, config.apiKey, config.model);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

/** Get embeddings for multiple texts. Sequential for local/Ollama, batched for OpenAI. */
export async function getBatchEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<number[][]> {
  if (config.provider === "openai" && config.apiKey) {
    // OpenAI supports batch embedding in a single request
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: texts, model: config.model }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI batch embedding error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return (data.data as { embedding: number[] }[])
      .sort((a: any, b: any) => a.index - b.index)
      .map((d: { embedding: number[] }) => d.embedding);
  }

  // Sequential for local and Ollama
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await getEmbedding(text, config));
  }
  return results;
}
