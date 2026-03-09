/** Embedding provider identifiers */
export type EmbeddingProviderType = "local" | "ollama" | "openai";

/** Provider metadata for UI display and configuration */
export interface EmbeddingProviderInfo {
  label: string;
  needsApiKey: boolean;
  needsEndpoint: boolean;
  defaultModel: string;
}

export const EMBEDDING_PROVIDER_INFO: Record<EmbeddingProviderType, EmbeddingProviderInfo> = {
  local: {
    label: "Local (Built-in)",
    needsApiKey: false,
    needsEndpoint: false,
    defaultModel: "Xenova/all-MiniLM-L6-v2",
  },
  ollama: {
    label: "Ollama",
    needsApiKey: false,
    needsEndpoint: true,
    defaultModel: "nomic-embed-text",
  },
  openai: {
    label: "OpenAI",
    needsApiKey: true,
    needsEndpoint: false,
    defaultModel: "text-embedding-3-small",
  },
};

/** Injection position for retrieved memories in the prompt */
export type VectorMemoryInjectionPosition =
  | "after_system"
  | "after_examples"
  | "before_history";

/** Global vector memory settings (stored in app_settings) */
export interface VectorMemorySettings {
  enabled: boolean;
  provider: EmbeddingProviderType;
  model: string;
  /** How many relevant past messages to inject (1–10) */
  insertCount: number;
  /** Minimum cosine similarity score (0–1) */
  scoreThreshold: number;
  /** How many recent messages to exclude from results (0–20) */
  protectCount: number;
  /** How many recent user messages to use as the search query (1–5) */
  queryDepth: number;
  /** Max characters per chunk for long messages */
  chunkSize: number;
  /** Template for formatting injected memories. {{text}} is replaced with the memories. */
  template: string;
  /** Where in the prompt to inject retrieved memories */
  injectionPosition: VectorMemoryInjectionPosition;
}

export const DEFAULT_VECTOR_MEMORY_SETTINGS: VectorMemorySettings = {
  enabled: false,
  provider: "local",
  model: "Xenova/all-MiniLM-L6-v2",
  insertCount: 3,
  scoreThreshold: 0.25,
  protectCount: 5,
  queryDepth: 2,
  chunkSize: 400,
  template: "[Relevant past events from this conversation:\n{{text}}]",
  injectionPosition: "before_history",
};

/** A single vector search result */
export interface VectorSearchResult {
  messageId: string;
  content: string;
  role: string;
  score: number;
  timestamp: string;
}

/** Embedding status for a chat */
export interface EmbeddingStatus {
  chatId: string;
  totalMessages: number;
  embeddedMessages: number;
  embeddingModel: string;
  lastEmbeddedAt: string | null;
}
