import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, X, Search, Loader2, Database } from "lucide-react";
import {
  getVectorMemoryStatus,
  embedAllMessages,
  searchVectorMemory,
  clearVectorMemory,
} from "@/lib/api";
import type { EmbeddingStatus, VectorSearchResult } from "@shared/vector-memory-types";

interface VectorMemoryPanelProps {
  chatId: string;
  onClose: () => void;
}

export function VectorMemoryPanel({ chatId, onClose }: VectorMemoryPanelProps) {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [embedding, setEmbedding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const refreshStatus = useCallback(() => {
    getVectorMemoryStatus(chatId).then(setStatus).catch(console.error);
  }, [chatId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleEmbedAll = useCallback(async () => {
    setEmbedding(true);
    try {
      const result = await embedAllMessages(chatId);
      console.log(`[vector-memory] Embedded ${result.embedded} messages`);
      refreshStatus();
    } catch (err) {
      console.error("[vector-memory] Embed failed:", err);
    }
    setEmbedding(false);
  }, [chatId, refreshStatus]);

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await clearVectorMemory(chatId);
      setResults([]);
      refreshStatus();
    } catch (err) {
      console.error("[vector-memory] Clear failed:", err);
    }
    setClearing(false);
    setConfirmClear(false);
  }, [chatId, refreshStatus]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchVectorMemory(chatId, searchQuery, 5);
      setResults(res);
    } catch (err) {
      console.error("[vector-memory] Search failed:", err);
    }
    setSearching(false);
  }, [chatId, searchQuery]);

  const progress = status
    ? status.totalMessages > 0
      ? Math.round((status.embeddedMessages / status.totalMessages) * 100)
      : 0
    : 0;

  return (
    <div className="flex h-full w-80 flex-col border-l border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Brain className="h-4 w-4" />
          Semantic Memory
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Embedding Status */}
        {status && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Embeddings
              </span>
              <span>{status.embeddedMessages} / {status.totalMessages}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-zinc-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Model: {status.embeddingModel}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleEmbedAll}
            disabled={embedding}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
          >
            {embedding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
            {embedding ? "Embedding..." : "Embed All"}
          </button>
          {confirmClear ? (
            <div className="flex gap-1">
              <button
                onClick={handleClear}
                disabled={clearing}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-40"
              >
                {clearing ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-lg bg-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-zinc-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search memories..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-600 disabled:opacity-40"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-400">
              Results ({results.length})
            </div>
            {results.map((r, i) => (
              <div
                key={`${r.messageId}-${i}`}
                className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-2.5"
              >
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span className="font-medium text-zinc-400">{r.role}</span>
                  <span className="font-mono">{(r.score * 100).toFixed(1)}%</span>
                </div>
                <p className="text-xs text-zinc-300 line-clamp-3">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
