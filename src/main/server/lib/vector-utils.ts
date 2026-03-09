/**
 * Pure vector math and text utilities for semantic memory.
 * No DB imports — safe for unit tests (like chat-utils.ts).
 */

import type { VectorSearchResult } from "../../../shared/vector-memory-types";

/** Cosine similarity between two Float32Arrays. Returns 0–1. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Serialize a number[] embedding to a Buffer (Float32Array binary). */
export function serializeVector(vec: number[]): Buffer {
  return Buffer.from(new Float32Array(vec).buffer);
}

/** Deserialize a Buffer back to a Float32Array. */
export function deserializeVector(buf: Buffer): Float32Array {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Float32Array(ab);
}

/**
 * Split text into chunks at sentence boundaries, with overlap.
 * Returns at least one chunk even for short text.
 */
export function chunkText(text: string, maxChunkSize: number): string[] {
  if (!text) return [];
  if (text.length <= maxChunkSize) return [text];

  // Split on sentence-ending punctuation followed by whitespace
  const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Overlap: keep last sentence fragment for context continuity
      const lastSentence = current.match(/[^.!?]*[.!?]+[\s]*$/)?.[0] || "";
      current = lastSentence + sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Fallback: if regex didn't split well, do character-based chunking
  if (chunks.length === 0) {
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push(text.slice(i, i + maxChunkSize).trim());
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Build a query string from the last N user messages.
 * Used as the search query for vector similarity.
 */
export function buildQueryText(
  messages: { role: string; content: string }[],
  queryDepth: number
): string {
  const userMessages = messages
    .filter((m) => m.role === "user" && m.content)
    .slice(-queryDepth);
  return userMessages.map((m) => m.content).join("\n");
}

/**
 * Format retrieved memories using a template string.
 * {{text}} is replaced with the concatenated memory content.
 */
export function formatMemoryInjection(
  results: VectorSearchResult[],
  template: string
): string {
  const text = results
    .map((r) => `[${r.role}] ${r.content}`)
    .join("\n");
  return template.replace("{{text}}", text);
}

/**
 * Prepend role context to text before embedding.
 * Gives the embedding model role awareness.
 */
export function prepareTextForEmbedding(role: string, content: string): string {
  return `[${role}] ${content}`;
}
