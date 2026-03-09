import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLibraryCharacters } from "@/lib/api";
import type { LibraryCharacter } from "@shared/types";

interface CharacterPickerModalProps {
  existingIds: string[];
  onConfirm: (characterIds: string[]) => void;
  onClose: () => void;
}

export function CharacterPickerModal({
  existingIds,
  onConfirm,
  onClose,
}: CharacterPickerModalProps) {
  const { t } = useTranslation('story');
  const [characters, setCharacters] = useState<LibraryCharacter[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLibraryCharacters().then((chars) => {
      setCharacters(chars.filter((c) => !existingIds.includes(c.id)));
      setLoading(false);
    });
  }, [existingIds]);

  function toggleChar(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = characters.filter((c) => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-[60vh] w-full max-w-md flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h3
            className="text-base font-bold text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {t('characterPicker.title')}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('characterPicker.search')}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">{t('characterPicker.empty')}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((char) => {
                const selected = selectedIds.has(char.id);
                return (
                  <button
                    key={char.id}
                    onClick={() => toggleChar(char.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-indigo-500/50 bg-indigo-500/10"
                        : "border-transparent hover:bg-zinc-800"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected ? "border-indigo-500 bg-indigo-500" : "border-zinc-600"
                      )}
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-400">
                      {char.name.charAt(0)}
                    </div>
                    <span className="text-sm text-zinc-200">{char.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-zinc-800 px-6 py-3">
          <button
            onClick={() => onConfirm([...selectedIds])}
            disabled={selectedIds.size === 0}
            className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-500"
          >
            {t('characterPicker.add', { count: selectedIds.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
