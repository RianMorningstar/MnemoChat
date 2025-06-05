import { Search, SlidersHorizontal, Plus, CheckSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortOption, SortOptionItem, LibraryStats } from "@shared/character-types";
import type { ContentTier } from "@shared/types";

const SORT_OPTIONS: SortOptionItem[] = [
  { value: "name", label: "Name" },
  { value: "created", label: "Date Created" },
  { value: "lastChatted", label: "Last Chatted" },
  { value: "tokenCount", label: "Token Count" },
];

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  contentTierFilter: ContentTier | "all";
  onContentTierFilterChange: (value: ContentTier | "all") => void;
  selectedTag: string | null;
  onSelectedTagChange: (value: string | null) => void;
  availableTags: string[];
  stats: LibraryStats;
  bulkMode: boolean;
  onBulkModeToggle: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onCreateNew: () => void;
}

export function LibraryToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  contentTierFilter,
  onContentTierFilterChange,
  selectedTag,
  onSelectedTagChange,
  availableTags,
  stats,
  bulkMode,
  onBulkModeToggle,
  selectedCount,
  onBulkDelete,
  onCreateNew,
}: LibraryToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Top row: search + actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search characters..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New Character
        </button>

        <button
          onClick={onBulkModeToggle}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm",
            bulkMode
              ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          )}
        >
          <CheckSquare className="h-4 w-4" />
          Select
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>

        {/* Content tier filter */}
        {(["all", "sfw", "nsfw"] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => onContentTierFilterChange(tier)}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              contentTierFilter === tier
                ? "bg-indigo-600/20 text-indigo-400"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            )}
          >
            {tier === "all" ? "All" : tier.toUpperCase()}
          </button>
        ))}

        {/* Sort */}
        <span className="ml-2 text-zinc-500">Sort:</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Tag filter */}
        {availableTags.length > 0 && (
          <>
            <span className="ml-2 text-zinc-500">Tag:</span>
            <select
              value={selectedTag || ""}
              onChange={(e) =>
                onSelectedTagChange(e.target.value || null)
              }
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Stats */}
        <span className="ml-auto text-xs text-zinc-500">
          {stats.totalCharacters} character{stats.totalCharacters !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2">
          <span className="text-sm text-zinc-300">
            {selectedCount} selected
          </span>
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1 rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 hover:bg-red-600/30"
          >
            <X className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
