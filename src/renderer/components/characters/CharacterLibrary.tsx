import { useState, useMemo, useCallback } from "react";
import { Upload } from "lucide-react";
import type { Character, SortOption, LibraryStats, ImportPreview } from "@shared/character-types";
import type { ContentTier } from "@shared/types";
import { CharacterCard } from "./CharacterCard";
import { LibraryToolbar } from "./LibraryToolbar";
import { ImportPreviewModal } from "./ImportPreviewModal";

interface CharacterLibraryProps {
  characters: Character[];
  onChat: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onCreateNew: () => void;
  onImportPng: (file: File) => void;
  importPreview: ImportPreview | null;
  onConfirmImport: () => void;
  onCancelImport: () => void;
  onBulkDelete: (ids: string[]) => void;
}

export function CharacterLibrary({
  characters,
  onChat,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onCreateNew,
  onImportPng,
  importPreview,
  onConfirmImport,
  onCancelImport,
  onBulkDelete,
}: CharacterLibraryProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("created");
  const [contentTierFilter, setContentTierFilter] = useState<ContentTier | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    characters.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [characters]);

  const stats: LibraryStats = useMemo(() => ({
    totalCharacters: characters.length,
    sfwCount: characters.filter((c) => c.contentTier === "sfw").length,
    nsfwCount: characters.filter((c) => c.contentTier === "nsfw").length,
    totalLorebook: characters.reduce((sum, c) => sum + (c.lorebookEntryCount || 0), 0),
  }), [characters]);

  const filtered = useMemo(() => {
    let result = characters;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (contentTierFilter !== "all") {
      result = result.filter((c) => c.contentTier === contentTierFilter);
    }

    if (selectedTag) {
      result = result.filter((c) => c.tags.includes(selectedTag));
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "lastChatted":
          return (b.lastChatted || "").localeCompare(a.lastChatted || "");
        case "tokenCount":
          return b.tokenCount - a.tokenCount;
        case "created":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return result;
  }, [characters, search, sort, contentTierFilter, selectedTag]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === "image/png") {
        onImportPng(file);
      }
    },
    [onImportPng]
  );

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <LibraryToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        contentTierFilter={contentTierFilter}
        onContentTierFilterChange={setContentTierFilter}
        selectedTag={selectedTag}
        onSelectedTagChange={setSelectedTag}
        availableTags={availableTags}
        stats={stats}
        bulkMode={bulkMode}
        onBulkModeToggle={() => {
          setBulkMode(!bulkMode);
          setSelectedIds(new Set());
        }}
        selectedCount={selectedIds.size}
        onBulkDelete={() => {
          onBulkDelete(Array.from(selectedIds));
          setSelectedIds(new Set());
          setBulkMode(false);
        }}
        onCreateNew={onCreateNew}
      />

      {/* Character grid or empty state */}
      {filtered.length === 0 ? (
        <div
          className={`mt-8 flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed ${
            dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-zinc-700"
          } p-12`}
        >
          <Upload className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-400">
            No characters yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Drop a PNG character card here, or create a new character
          </p>
          <button
            onClick={onCreateNew}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Create New Character
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              selected={selectedIds.has(character.id)}
              onChat={onChat}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onExport={onExport}
              onDelete={onDelete}
              onSelect={toggleSelect}
              bulkMode={bulkMode}
            />
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && filtered.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border-2 border-dashed border-indigo-500 bg-zinc-900/90 px-12 py-8">
            <Upload className="mx-auto mb-2 h-10 w-10 text-indigo-400" />
            <p className="text-sm font-medium text-indigo-300">
              Drop PNG to import
            </p>
          </div>
        </div>
      )}

      {/* Import preview modal */}
      {importPreview && (
        <ImportPreviewModal
          preview={importPreview}
          onConfirm={onConfirmImport}
          onCancel={onCancelImport}
        />
      )}
    </div>
  );
}
