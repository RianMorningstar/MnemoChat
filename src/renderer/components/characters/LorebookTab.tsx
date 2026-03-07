import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen, X, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LorebookEntry, InsertionPosition, LorebookLogic } from "@shared/character-types";
import type { LibraryLorebook } from "@shared/library-types";

interface LorebookTabProps {
  entries: LorebookEntry[];
  attachedLorebooks: LibraryLorebook[];
  availableLorebooks: LibraryLorebook[];
  onCreate: () => void;
  onUpdate: (id: string, updates: Partial<LorebookEntry>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAttach: (lorebookId: string) => void;
  onDetach: (lorebookId: string) => void;
}

const INSERTION_OPTIONS: { value: InsertionPosition; label: string }[] = [
  { value: "before_character", label: "Before Character" },
  { value: "after_character", label: "After Character" },
  { value: "before_example", label: "Before Examples" },
  { value: "after_example", label: "After Examples" },
];

const LOGIC_OPTIONS: { value: LorebookLogic; label: string }[] = [
  { value: "AND_ANY", label: "Match any keyword" },
  { value: "AND_ALL", label: "Match all keywords" },
  { value: "NOT_ANY", label: "Exclude any keyword" },
  { value: "NOT_ALL", label: "Exclude all keywords" },
];

export function LorebookTab({
  entries,
  attachedLorebooks,
  availableLorebooks,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
  onAttach,
  onDetach,
}: LorebookTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const attachedIds = new Set(attachedLorebooks.map((l) => l.id));
  const unattached = availableLorebooks.filter((l) => !attachedIds.has(l.id));

  return (
    <div className="space-y-6">
      {/* Attached Lorebooks section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Attached Lorebooks</h3>
          <div className="relative">
            <button
              onClick={() => setPickerOpen((p) => !p)}
              disabled={unattached.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Link className="h-3 w-3" />
              Attach Lorebook
            </button>
            {pickerOpen && unattached.length > 0 && (
              <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {unattached.map((lb) => (
                  <button
                    key={lb.id}
                    onClick={() => { onAttach(lb.id); setPickerOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span className="truncate">{lb.name}</span>
                    <span className="ml-auto text-[10px] text-zinc-500">{lb.entryCount} entries</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {attachedLorebooks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center">
            <p className="text-xs text-zinc-500">No lorebooks attached. Attach a library lorebook to include its entries during chat.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachedLorebooks.map((lb) => (
              <div key={lb.id} className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
                <BookOpen className="h-4 w-4 shrink-0 text-indigo-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{lb.name}</span>
                <span className="text-xs text-zinc-500">{lb.entryCount} entries</span>
                <button
                  onClick={() => onDetach(lb.id)}
                  className="rounded p-0.5 text-zinc-500 hover:bg-red-900/20 hover:text-red-400"
                  title="Detach"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800" />

      {/* Character entries section */}
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">
          Character Entries
          <span className="ml-2 text-zinc-500 font-normal">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </span>
        </h3>
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

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-zinc-400">
                          Trigger Logic
                        </label>
                        <select
                          value={entry.logic}
                          onChange={(e) =>
                            onUpdate(entry.id, {
                              logic: e.target.value as LorebookLogic,
                            })
                          }
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
                        >
                          {LOGIC_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <label className="mb-1 block text-xs font-medium text-zinc-400">
                          Probability %
                        </label>
                        <input
                          type="number"
                          value={entry.probability}
                          onChange={(e) =>
                            onUpdate(entry.id, {
                              probability: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                            })
                          }
                          min={0}
                          max={100}
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="w-28">
                        <label className="mb-1 block text-xs font-medium text-zinc-400">
                          Scan Depth
                        </label>
                        <input
                          type="number"
                          value={entry.scanDepth}
                          onChange={(e) =>
                            onUpdate(entry.id, {
                              scanDepth: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          min={0}
                          placeholder="0 = all"
                          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
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
    </div>
  );
}
