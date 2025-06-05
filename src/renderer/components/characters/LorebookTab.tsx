import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LorebookEntry, InsertionPosition } from "@shared/character-types";

interface LorebookTabProps {
  entries: LorebookEntry[];
  onCreate: () => void;
  onUpdate: (id: string, updates: Partial<LorebookEntry>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const INSERTION_OPTIONS: { value: InsertionPosition; label: string }[] = [
  { value: "before_character", label: "Before Character" },
  { value: "after_character", label: "After Character" },
  { value: "before_example", label: "Before Examples" },
  { value: "after_example", label: "After Examples" },
];

export function LorebookTab({
  entries,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
}: LorebookTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {entries.length} entr{entries.length === 1 ? "y" : "ies"}
        </p>
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
          <p className="text-sm text-zinc-500">
            No lorebook entries yet. Add entries to inject contextual information
            based on keywords.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const expanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className={cn(
                  "rounded-lg border bg-zinc-800/50",
                  entry.enabled ? "border-zinc-700" : "border-zinc-800 opacity-60"
                )}
              >
                {/* Header row */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  )}

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm text-zinc-200">
                      {entry.keywords.length > 0
                        ? entry.keywords.join(", ")
                        : "No keywords"}
                    </span>
                    <span className="flex-shrink-0 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      P{entry.priority}
                    </span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(entry.id); }}
                    className={cn(
                      "h-5 w-9 rounded-full transition-colors",
                      entry.enabled ? "bg-indigo-600" : "bg-zinc-600"
                    )}
                  >
                    <span
                      className={cn(
                        "block h-4 w-4 rounded-full bg-white transition-transform",
                        entry.enabled ? "translate-x-4.5" : "translate-x-0.5"
                      )}
                    />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                    className="rounded p-1 text-zinc-500 hover:bg-red-900/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="space-y-4 border-t border-zinc-700 px-4 py-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-400">
                        Keywords
                      </label>
                      <input
                        type="text"
                        value={entry.keywords.join(", ")}
                        onChange={(e) =>
                          onUpdate(entry.id, {
                            keywords: e.target.value
                              .split(",")
                              .map((k) => k.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Comma-separated keywords"
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-400">
                        Content
                      </label>
                      <textarea
                        value={entry.content || ""}
                        onChange={(e) =>
                          onUpdate(entry.id, { content: e.target.value })
                        }
                        rows={4}
                        placeholder="Information to inject when keywords are detected..."
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-zinc-400">
                          Insertion Position
                        </label>
                        <select
                          value={entry.insertionPosition}
                          onChange={(e) =>
                            onUpdate(entry.id, {
                              insertionPosition: e.target
                                .value as InsertionPosition,
                            })
                          }
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                        >
                          {INSERTION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="mb-1 block text-xs font-medium text-zinc-400">
                          Priority
                        </label>
                        <input
                          type="number"
                          value={entry.priority}
                          onChange={(e) =>
                            onUpdate(entry.id, {
                              priority: parseInt(e.target.value) || 0,
                            })
                          }
                          min={0}
                          max={100}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
