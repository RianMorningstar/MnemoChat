import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { CharacterLibrary } from "@/components/characters";
import {
  getCharacters,
  createCharacter,
  deleteCharacter,
  duplicateCharacter,
} from "@/lib/api";
import { extractCharacterFromPng } from "@/lib/png-metadata";
import type { Character, ImportPreview } from "@shared/character-types";

export function CharacterLibraryPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingImportData, setPendingImportData] = useState<Partial<Character> | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      const data = await getCharacters();
      setCharacters(data);
    } catch (err) {
      console.error("Failed to fetch characters:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleCreateNew = useCallback(async () => {
    try {
      const char = await createCharacter({ name: "New Character" });
      navigate(`/characters/${char.id}/edit`);
    } catch (err) {
      console.error("Failed to create character:", err);
    }
  }, [navigate]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteCharacter(id);
        setCharacters((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error("Failed to delete character:", err);
      }
    },
    []
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const dup = await duplicateCharacter(id);
        setCharacters((prev) => [dup, ...prev]);
      } catch (err) {
        console.error("Failed to duplicate character:", err);
      }
    },
    []
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        await Promise.all(ids.map(deleteCharacter));
        setCharacters((prev) => prev.filter((c) => !ids.includes(c.id)));
      } catch (err) {
        console.error("Failed to bulk delete:", err);
      }
    },
    []
  );

  const handleImportPng = useCallback(async (file: File) => {
    try {
      const card = await extractCharacterFromPng(file);
      if (!card) {
        console.warn("No character card data found in PNG");
        return;
      }

      // Convert the PNG to a persistent data URL for storage
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const preview: ImportPreview = {
        name: card.name,
        description: card.description,
        portraitUrl: dataUrl,
        tags: card.tags,
        creatorName: card.creatorName,
        characterVersion: card.characterVersion,
        tokenCount: 0,
      };
      setImportPreview(preview);
      setPendingImportData({
        name: card.name,
        portraitUrl: dataUrl,
        description: card.description,
        personality: card.personality,
        scenario: card.scenario,
        firstMessage: card.firstMessage,
        alternateGreetings: card.alternateGreetings,
        systemPrompt: card.systemPrompt,
        postHistoryInstructions: card.postHistoryInstructions,
        exampleDialogues: card.exampleDialogues,
        creatorNotes: card.creatorNotes,
        tags: card.tags,
        creatorName: card.creatorName,
        characterVersion: card.characterVersion,
        specVersion: card.specVersion as "v1" | "v2",
      });
    } catch (err) {
      console.error("Failed to parse PNG character card:", err);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!pendingImportData) return;
    try {
      const char = await createCharacter({
        ...pendingImportData,
        importDate: new Date().toISOString(),
      });
      setCharacters((prev) => [char, ...prev]);
    } catch (err) {
      console.error("Failed to import character:", err);
    } finally {
      setImportPreview(null);
      setPendingImportData(null);
    }
  }, [pendingImportData]);

  const handleCancelImport = useCallback(() => {
    setImportPreview(null);
    setPendingImportData(null);
  }, []);

  const handleExport = useCallback((_id: string) => {
    // Placeholder for export functionality
    console.log("Export not yet implemented");
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-zinc-100">
          Characters
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Create and manage your character library.
        </p>
      </div>

      <CharacterLibrary
        characters={characters}
        onChat={(id) => navigate(`/chat?character=${id}`)}
        onEdit={(id) => navigate(`/characters/${id}/edit`)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
        onCreateNew={handleCreateNew}
        onImportPng={handleImportPng}
        importPreview={importPreview}
        onConfirmImport={handleConfirmImport}
        onCancelImport={handleCancelImport}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
}
