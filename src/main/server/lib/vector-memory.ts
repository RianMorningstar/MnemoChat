/**
 * Vector memory — DB-dependent functions (like branch-logic.ts).
 * Handles embedding storage, retrieval, and similarity search.
 */

import { db } from "../../db";
import { messageEmbeddings, messages } from "../../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import type { EmbeddingConfig } from "./embedding-providers";
import { getEmbedding, getBatchEmbeddings } from "./embedding-providers";
import {
  serializeVector,
  deserializeVector,
  cosineSimilarity,
  chunkText,
  prepareTextForEmbedding,
} from "./vector-utils";
import type { VectorSearchResult, EmbeddingStatus } from "../../../shared/vector-memory-types";

type MessageRow = typeof messages.$inferSelect;

/**
 * Embed a single message (with chunking for long text).
 * Skips if already embedded with the same model.
 */
export async function embedMessage(
  messageId: string,
  chatId: string,
  content: string,
  role: string,
  config: EmbeddingConfig,
  chunkSize: number = 400
): Promise<void> {
  // Check if already embedded with this model
  const existing = db
    .select({ id: messageEmbeddings.id })
    .from(messageEmbeddings)
    .where(
      and(
        eq(messageEmbeddings.messageId, messageId),
        eq(messageEmbeddings.embeddingModel, config.model)
      )
    )
    .all();
  if (existing.length > 0) return;

  const preparedText = prepareTextForEmbedding(role, content);
  const chunks = chunkText(preparedText, chunkSize);
  const embeddings = await getBatchEmbeddings(chunks, config);
  const now = new Date().toISOString();

  for (let i = 0; i < chunks.length; i++) {
    const vec = serializeVector(embeddings[i]);
    db.insert(messageEmbeddings)
      .values({
        id: crypto.randomUUID(),
        messageId,
        chatId,
        chunkIndex: i,
        chunkText: chunks[i],
        embedding: vec,
        embeddingModel: config.model,
        dimensions: embeddings[i].length,
        createdAt: now,
      })
      .run();
  }
}

/**
 * Embed all un-embedded messages in a branch path.
 * Returns the count of newly embedded messages.
 */
export async function embedBranchMessages(
  chatId: string,
  branchMessages: MessageRow[],
  config: EmbeddingConfig,
  chunkSize: number = 400
): Promise<number> {
  // Get IDs of messages already embedded with this model
  const embeddedRows = db
    .select({ messageId: messageEmbeddings.messageId })
    .from(messageEmbeddings)
    .where(
      and(
        eq(messageEmbeddings.chatId, chatId),
        eq(messageEmbeddings.embeddingModel, config.model)
      )
    )
    .all();
  const embeddedIds = new Set(embeddedRows.map((r) => r.messageId));

  // Filter to un-embedded messages with content
  const toEmbed = branchMessages.filter(
    (m) => !embeddedIds.has(m.id) && m.content && m.content.trim().length > 0
  );

  for (const msg of toEmbed) {
    await embedMessage(msg.id, chatId, msg.content!, msg.role, config, chunkSize);
  }

  return toEmbed.length;
}

/**
 * Search for messages similar to a query vector.
 * Filters to messages in the branch and excludes protected (recent) messages.
 */
export function searchSimilarMessages(
  chatId: string,
  queryVector: Float32Array,
  branchMessageIds: Set<string>,
  protectIds: Set<string>,
  topK: number,
  threshold: number,
  embeddingModel: string
): VectorSearchResult[] {
  // Load all embeddings for this chat + model
  const rows = db
    .select()
    .from(messageEmbeddings)
    .where(
      and(
        eq(messageEmbeddings.chatId, chatId),
        eq(messageEmbeddings.embeddingModel, embeddingModel)
      )
    )
    .all();

  // Score each embedding
  const scored: {
    messageId: string;
    chunkText: string;
    score: number;
    createdAt: string;
  }[] = [];

  for (const row of rows) {
    // Skip if not in active branch or in protected set
    if (!branchMessageIds.has(row.messageId)) continue;
    if (protectIds.has(row.messageId)) continue;

    const vec = deserializeVector(row.embedding as Buffer);
    const score = cosineSimilarity(queryVector, vec);
    if (score >= threshold) {
      scored.push({
        messageId: row.messageId,
        chunkText: row.chunkText,
        score,
        createdAt: row.createdAt,
      });
    }
  }

  // Sort by score descending, take top K
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by messageId (keep highest-scoring chunk per message)
  const seen = new Set<string>();
  const deduped = scored.filter((s) => {
    if (seen.has(s.messageId)) return false;
    seen.add(s.messageId);
    return true;
  });

  const topResults = deduped.slice(0, topK);

  // Enrich with message metadata
  if (topResults.length === 0) return [];

  const messageIds = topResults.map((r) => r.messageId);
  const msgRows = db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      timestamp: messages.timestamp,
    })
    .from(messages)
    .where(inArray(messages.id, messageIds))
    .all();

  const msgMap = new Map(msgRows.map((m) => [m.id, m]));

  return topResults
    .map((r) => {
      const msg = msgMap.get(r.messageId);
      if (!msg) return null;
      return {
        messageId: r.messageId,
        content: msg.content || r.chunkText,
        role: msg.role,
        score: r.score,
        timestamp: msg.timestamp,
      };
    })
    .filter((r): r is VectorSearchResult => r !== null);
}

/** Get embedding status for a chat. */
export function getEmbeddingStatus(
  chatId: string,
  embeddingModel: string
): EmbeddingStatus {
  // Count total messages in this chat
  const totalRows = db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .all();

  // Count distinct embedded message IDs for this model
  const embeddedRows = db
    .select({ messageId: messageEmbeddings.messageId })
    .from(messageEmbeddings)
    .where(
      and(
        eq(messageEmbeddings.chatId, chatId),
        eq(messageEmbeddings.embeddingModel, embeddingModel)
      )
    )
    .all();
  const uniqueEmbedded = new Set(embeddedRows.map((r) => r.messageId));

  // Find the most recent embedding timestamp
  const latest = embeddedRows.length > 0
    ? db
        .select({ createdAt: messageEmbeddings.createdAt })
        .from(messageEmbeddings)
        .where(
          and(
            eq(messageEmbeddings.chatId, chatId),
            eq(messageEmbeddings.embeddingModel, embeddingModel)
          )
        )
        .all()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt || null
    : null;

  return {
    chatId,
    totalMessages: totalRows.length,
    embeddedMessages: uniqueEmbedded.size,
    embeddingModel,
    lastEmbeddedAt: latest,
  };
}

/** Delete all embeddings for a chat. */
export function deleteEmbeddings(chatId: string): void {
  db.delete(messageEmbeddings)
    .where(eq(messageEmbeddings.chatId, chatId))
    .run();
}

/** Delete embeddings for a specific message. */
export function deleteMessageEmbeddings(messageId: string): void {
  db.delete(messageEmbeddings)
    .where(eq(messageEmbeddings.messageId, messageId))
    .run();
}
