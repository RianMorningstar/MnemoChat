import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { appSettings, connectionProfiles, chats } from "../../db/schema";
import type { EmbeddingProviderType } from "../../../shared/vector-memory-types";
import { DEFAULT_VECTOR_MEMORY_SETTINGS } from "../../../shared/vector-memory-types";
import type { EmbeddingConfig } from "../lib/embedding-providers";
import { getEmbedding } from "../lib/embedding-providers";
import { getBranchPath } from "../lib/branch-logic";
import {
  embedBranchMessages,
  searchSimilarMessages,
  getEmbeddingStatus,
  deleteEmbeddings,
} from "../lib/vector-memory";

/** Read a setting from app_settings, returning null if not found */
function getSetting(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? null;
}

/** Build an EmbeddingConfig from app_settings + active connection profile. */
export function resolveEmbeddingConfig(): EmbeddingConfig {
  const provider = (getSetting("vector_memory_provider") || DEFAULT_VECTOR_MEMORY_SETTINGS.provider) as EmbeddingProviderType;
  const model = getSetting("vector_memory_model") || DEFAULT_VECTOR_MEMORY_SETTINGS.model;

  let endpoint: string | undefined;
  let apiKey: string | undefined;

  if (provider === "ollama") {
    // Reuse active connection profile's endpoint
    const profile = db
      .select()
      .from(connectionProfiles)
      .where(eq(connectionProfiles.isActive, 1))
      .get();
    endpoint = profile?.endpoint || "http://localhost:11434";
  } else if (provider === "openai") {
    apiKey = getSetting("vector_memory_openai_api_key") || undefined;
    // Fallback to active connection profile's API key if it's an OpenAI profile
    if (!apiKey) {
      const profile = db
        .select()
        .from(connectionProfiles)
        .where(eq(connectionProfiles.isActive, 1))
        .get();
      if (profile?.type === "openai" && profile.apiKey) {
        apiKey = profile.apiKey;
      }
    }
  }

  return { provider, model, endpoint, apiKey };
}

export async function vectorMemoryRoutes(fastify: FastifyInstance) {
  // GET /api/chats/:chatId/vector-memory/status
  fastify.get<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/vector-memory/status",
    async (request) => {
      const { chatId } = request.params;
      const config = resolveEmbeddingConfig();
      return getEmbeddingStatus(chatId, config.model);
    }
  );

  // POST /api/chats/:chatId/vector-memory/embed-all
  fastify.post<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/vector-memory/embed-all",
    async (request) => {
      const { chatId } = request.params;
      const config = resolveEmbeddingConfig();
      const chunkSize = parseInt(getSetting("vector_memory_chunk_size") || "") || DEFAULT_VECTOR_MEMORY_SETTINGS.chunkSize;

      // Get all messages in the active branch
      const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
      if (!chat) return { embedded: 0 };

      const branchMessages = getBranchPath(chatId, chat.activeLeafId);
      const embedded = await embedBranchMessages(chatId, branchMessages, config, chunkSize);
      return { embedded };
    }
  );

  // POST /api/chats/:chatId/vector-memory/search
  fastify.post<{
    Params: { chatId: string };
    Body: { query: string; topK?: number };
  }>(
    "/api/chats/:chatId/vector-memory/search",
    async (request) => {
      const { chatId } = request.params;
      const { query, topK = 5 } = request.body;
      const config = resolveEmbeddingConfig();
      const threshold = parseFloat(getSetting("vector_memory_score_threshold") || "") || DEFAULT_VECTOR_MEMORY_SETTINGS.scoreThreshold;

      // Get branch message IDs
      const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
      if (!chat) return [];

      const branchMessages = getBranchPath(chatId, chat.activeLeafId);
      const branchIds = new Set(branchMessages.map((m) => m.id));

      // Get query embedding
      const queryVec = await getEmbedding(query, config);
      const queryFloat32 = new Float32Array(queryVec);

      return searchSimilarMessages(
        chatId,
        queryFloat32,
        branchIds,
        new Set(), // no protected IDs for manual search
        topK,
        threshold,
        config.model
      );
    }
  );

  // DELETE /api/chats/:chatId/vector-memory
  fastify.delete<{ Params: { chatId: string } }>(
    "/api/chats/:chatId/vector-memory",
    async (request) => {
      const { chatId } = request.params;
      deleteEmbeddings(chatId);
      return { success: true };
    }
  );

  // GET /api/vector-memory/models
  fastify.get("/api/vector-memory/models", async () => {
    // Return recommended models per provider
    return {
      local: ["Xenova/all-MiniLM-L6-v2", "Xenova/all-MiniLM-L12-v2"],
      ollama: ["nomic-embed-text", "mxbai-embed-large", "all-minilm"],
      openai: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
    };
  });
}
