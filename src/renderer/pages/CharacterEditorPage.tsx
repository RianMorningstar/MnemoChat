import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { CharacterEditor } from "@/components/characters";
import {
  getCharacter,
  updateCharacter,
  getLorebookEntries,
  createLorebookEntry,
  updateLorebookEntry,
  deleteLorebookEntry,
  toggleLorebookEntry,
  getLibraryLorebooks,
  getCharacterAttachedLorebooks,
  attachLorebookToCharacter,
  detachLorebookFromCharacter,
} from "@/lib/api";
import type { Character, LorebookEntry } from "@shared/character-types";
import type { LibraryLorebook } from "@shared/library-types";

export function CharacterEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('characters');
  const [character, setCharacter] = useState<Character | null>(null);
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  const [attachedLorebooks, setAttachedLorebooks] = useState<LibraryLorebook[]>([]);
  const [allLorebooks, setAllLorebooks] = useState<LibraryLorebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getCharacter(id),
      getLorebookEntries(id),
      getCharacterAttachedLorebooks(id),
      getLibraryLorebooks(),
    ])
      .then(([char, entries, attached, all]) => {
        setCharacter(char);
        setLorebookEntries(entries);
        setAttachedLorebooks(attached);
        setAllLorebooks(all);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = useCallback(
    async (updates: Partial<Character>) => {
      if (!id) return;
      try {
        const updated = await updateCharacter(id, updates);
        setCharacter(updated);
      } catch (err) {
        console.error("Failed to save character:", err);
      }
    },
    [id]
  );

  const handleCreateEntry = useCallback(async () => {
    if (!id) return;
    try {
      const entry = await createLorebookEntry(id, {
        keywords: [],
        content: "",
      });
      setLorebookEntries((prev) => [...prev, entry]);
    } catch (err) {
      console.error("Failed to create lorebook entry:", err);
    }
  }, [id]);

  const handleUpdateEntry = useCallback(
    async (entryId: string, updates: Partial<LorebookEntry>) => {
      try {
        const updated = await updateLorebookEntry(entryId, updates);
        setLorebookEntries((prev) =>
          prev.map((e) => (e.id === entryId ? updated : e))
        );
      } catch (err) {
        console.error("Failed to update lorebook entry:", err);
      }
    },
    []
  );

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    try {
      await deleteLorebookEntry(entryId);
      setLorebookEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      console.error("Failed to delete lorebook entry:", err);
    }
  }, []);

  const handleToggleEntry = useCallback(async (entryId: string) => {
    try {
      const toggled = await toggleLorebookEntry(entryId);
      setLorebookEntries((prev) =>
        prev.map((e) => (e.id === entryId ? toggled : e))
      );
    } catch (err) {
      console.error("Failed to toggle lorebook entry:", err);
    }
  }, []);

  const handleAttachLorebook = useCallback(async (lorebookId: string) => {
    if (!id) return;
    try {
      await attachLorebookToCharacter(id, lorebookId);
      const attached = await getCharacterAttachedLorebooks(id);
      setAttachedLorebooks(attached);
    } catch (err) {
      console.error("Failed to attach lorebook:", err);
    }
  }, [id]);

  const handleDetachLorebook = useCallback(async (lorebookId: string) => {
    if (!id) return;
    try {
      await detachLorebookFromCharacter(id, lorebookId);
      setAttachedLorebooks((prev) => prev.filter((l) => l.id !== lorebookId));
    } catch (err) {
      console.error("Failed to detach lorebook:", err);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-400">
          {error || t('error.notFound')}
        </p>
        <button
          onClick={() => navigate("/characters")}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          {t('error.backToLibrary')}
        </button>
      </div>
    );
  }

  return (
    <CharacterEditor
      character={character}
      lorebookEntries={lorebookEntries}
      attachedLorebooks={attachedLorebooks}
      availableLorebooks={allLorebooks}
      onSave={handleSave}
      onBack={() => navigate("/characters")}
      onCreateLorebookEntry={handleCreateEntry}
      onUpdateLorebookEntry={handleUpdateEntry}
      onDeleteLorebookEntry={handleDeleteEntry}
      onToggleLorebookEntry={handleToggleEntry}
      onAttachLorebook={handleAttachLorebook}
      onDetachLorebook={handleDetachLorebook}
    />
  );
}
