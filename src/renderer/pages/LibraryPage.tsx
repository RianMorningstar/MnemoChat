import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { cn } from "@/lib/utils";
import { MyLibrary } from "@/components/library/MyLibrary";
import { DiscoverFeed } from "@/components/library/DiscoverFeed";
import {
  ImportPreviewModal,
  type ImportPreview,
} from "@/components/library/ImportPreviewModal";
import {
  getLibraryCharacters,
  getCollections,
  getLibraryLorebooks,
  getPersonas,
  createCollection,
  deleteCollection,
  deleteCharacter,
  duplicateCharacter,
  deleteLibraryLorebook,
  duplicateLibraryLorebook,
  exportLorebook,
  importLorebook,
  deletePersona,
  duplicatePersona,
  setDefaultPersona,
  createPersona,
  getSetting,
  setSetting,
  createCharacter,
} from "@/lib/api";
import {
  extractCharacterFromPng,
  parseCharacterJson,
} from "@/lib/png-metadata";
import type {
  LibraryCharacter,
  Collection,
  LibraryLorebook,
  Persona,
  LibraryTab,
  LibraryContentType,
  GridDensity,
  DiscoverFeedTab,
  LibrarySortOptionItem,
} from "@shared/library-types";

const SORT_OPTIONS: LibrarySortOptionItem[] = [
  { id: "last_chatted", label: "Recently Chatted" },
  { id: "last_imported", label: "Recently Imported" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "most_chatted", label: "Most Chatted" },
  { id: "date_created", label: "Date Created" },
];

const FEED_TABS: DiscoverFeedTab[] = [
  "featured",
  "trending",
  "new",
  "following",
  "recommended",
];

export function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // Tab state — persisted in URL so it survives remounts
  const activeTab = (searchParams.get("tab") as LibraryTab) || "my-library";
  const setActiveTab = useCallback(
    (tab: LibraryTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === "my-library") {
            next.delete("tab");
          } else {
            next.set("tab", tab);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const [activeContentType, setActiveContentType] =
    useState<LibraryContentType>("characters");
  const [gridDensity, setGridDensity] = useState<GridDensity>("comfortable");

  // Data
  const [libraryCharacters, setLibraryCharacters] = useState<
    LibraryCharacter[]
  >([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [lorebooks, setLorebooks] = useState<LibraryLorebook[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Import state
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null
  );
  const [importLoading, setImportLoading] = useState(false);
  const pendingImportRef = useRef<
    (() => Promise<{ id: string } | unknown>) | null
  >(null);
  const pendingTypeRef = useRef<"character" | "lorebook" | "persona" | null>(
    null
  );

  const fetchLibraryData = useCallback(async () => {
    try {
      const [chars, colls, lbs, pers] = await Promise.all([
        getLibraryCharacters(),
        getCollections(),
        getLibraryLorebooks(),
        getPersonas(),
      ]);
      setLibraryCharacters(chars);
      setCollections(colls);
      setLorebooks(lbs);
      setPersonas(pers);
    } catch (err) {
      console.error("Failed to fetch library data:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const setting = await getSetting("grid_density");
        if (setting?.value) {
          setGridDensity(setting.value as GridDensity);
        }
      } catch {}

      await fetchLibraryData();
      setLoading(false);
    }
    init();
  }, [fetchLibraryData]);

  // Grid density persistence
  const handleChangeGridDensity = useCallback((density: GridDensity) => {
    setGridDensity(density);
    setSetting("grid_density", density).catch(() => {});
  }, []);

  // Character actions
  const handleChat = useCallback(
    (id: string) => navigate(`/chat?character=${id}`),
    [navigate]
  );

  const handleEdit = useCallback(
    (id: string) => navigate(`/characters/${id}/edit`),
    [navigate]
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteCharacter(id);
      setLibraryCharacters((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete character:", err);
    }
  }, []);

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        await duplicateCharacter(id);
        await fetchLibraryData();
      } catch (err) {
        console.error("Failed to duplicate character:", err);
      }
    },
    [fetchLibraryData]
  );

  // Collection actions
  const handleCreateCollection = useCallback(async (name: string) => {
    try {
      const col = await createCollection({ name });
      setCollections((prev) => [...prev, col]);
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  }, []);

  const handleDeleteCollection = useCallback(async (id: string) => {
    try {
      await deleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  }, []);

  // Lorebook actions
  const handleDeleteLorebook = useCallback(async (id: string) => {
    try {
      await deleteLibraryLorebook(id);
      setLorebooks((prev) => prev.filter((lb) => lb.id !== id));
    } catch (err) {
      console.error("Failed to delete lorebook:", err);
    }
  }, []);

  const handleDuplicateLorebook = useCallback(
    async (id: string) => {
      try {
        await duplicateLibraryLorebook(id);
        await fetchLibraryData();
      } catch (err) {
        console.error("Failed to duplicate lorebook:", err);
      }
    },
    [fetchLibraryData]
  );

  const handleExportLorebook = useCallback(async (id: string) => {
    try {
      const data = await exportLorebook(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lorebook-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export lorebook:", err);
    }
  }, []);

  // Persona actions
  const handleDeletePersona = useCallback(async (id: string) => {
    try {
      await deletePersona(id);
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete persona:", err);
    }
  }, []);

  const handleDuplicatePersona = useCallback(
    async (id: string) => {
      try {
        await duplicatePersona(id);
        await fetchLibraryData();
      } catch (err) {
        console.error("Failed to duplicate persona:", err);
      }
    },
    [fetchLibraryData]
  );

  const handleSetDefaultPersona = useCallback(
    async (id: string) => {
      try {
        await setDefaultPersona(id);
        await fetchLibraryData();
      } catch (err) {
        console.error("Failed to set default persona:", err);
      }
    },
    [fetchLibraryData]
  );

  const handleEditPersona = useCallback(
    (id: string) => navigate(`/personas/${id}/edit`),
    [navigate]
  );

  const handleCreatePersona = useCallback(async () => {
    try {
      const persona = await createPersona({ name: "New Persona" });
      navigate(`/personas/${persona.id}/edit`);
    } catch (err) {
      console.error("Failed to create persona:", err);
    }
  }, [navigate]);

  // Refresh library after a discover import
  const handleDiscoverImport = useCallback(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // ── Import handlers ───────────────────────────────────────────────

  const handleImportCharacterFile = useCallback(async (file: File) => {
    try {
      let parsed = null;
      let portraitDataUrl: string | null = null;

      if (file.name.endsWith(".png")) {
        parsed = await extractCharacterFromPng(file);
        if (parsed) {
          portraitDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }
      } else if (file.name.endsWith(".json")) {
        const text = await file.text();
        const json = JSON.parse(text);
        parsed = parseCharacterJson(json);
      }

      if (!parsed) return;

      const preview: ImportPreview = {
        type: "character",
        name: parsed.name,
        tags: parsed.tags,
        description: parsed.description,
        portraitDataUrl,
      };

      const capturedParsed = parsed;
      const capturedPortrait = portraitDataUrl;
      pendingImportRef.current = () =>
        createCharacter({
          name: capturedParsed.name,
          description: capturedParsed.description ?? undefined,
          personality: capturedParsed.personality ?? undefined,
          scenario: capturedParsed.scenario ?? undefined,
          firstMessage: capturedParsed.firstMessage ?? undefined,
          alternateGreetings: capturedParsed.alternateGreetings,
          systemPrompt: capturedParsed.systemPrompt ?? undefined,
          postHistoryInstructions:
            capturedParsed.postHistoryInstructions ?? undefined,
          exampleDialogues: capturedParsed.exampleDialogues,
          creatorNotes: capturedParsed.creatorNotes ?? undefined,
          tags: capturedParsed.tags,
          creatorName: capturedParsed.creatorName ?? undefined,
          characterVersion: capturedParsed.characterVersion ?? undefined,
          specVersion: capturedParsed.specVersion as "v1" | "v2",
          portraitUrl: capturedPortrait ?? undefined,
          importDate: new Date().toISOString(),
        });
      pendingTypeRef.current = "character";
      setImportPreview(preview);
    } catch (err) {
      console.error("Failed to parse character file:", err);
    }
  }, []);

  const handleImportLorebookFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || !Array.isArray(data.entries)) {
        console.error("Invalid lorebook JSON: missing entries array");
        return;
      }

      const preview: ImportPreview = {
        type: "lorebook",
        name: data.name || "Imported Lorebook",
        tags: data.tags || [],
        entryCount: data.entries.length,
        coverColor: data.coverColor || "zinc",
      };

      const capturedData = data;
      pendingImportRef.current = () => importLorebook(capturedData);
      pendingTypeRef.current = "lorebook";
      setImportPreview(preview);
    } catch (err) {
      console.error("Failed to parse lorebook file:", err);
    }
  }, []);

  const handleImportPersonaFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || typeof data.name !== "string") {
        console.error("Invalid persona JSON: missing name");
        return;
      }

      const preview: ImportPreview = {
        type: "persona",
        name: data.name,
        description: data.description || "",
        avatarUrl: data.avatarUrl || "",
      };

      const capturedData = data;
      pendingImportRef.current = () =>
        createPersona({
          name: capturedData.name,
          description: capturedData.description,
          avatarUrl: capturedData.avatarUrl,
        });
      pendingTypeRef.current = "persona";
      setImportPreview(preview);
    } catch (err) {
      console.error("Failed to parse persona file:", err);
    }
  }, []);

  // Auto-detects JSON content type for global drag-and-drop
  const handleImportJsonFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (Array.isArray(data.entries)) {
          await handleImportLorebookFile(file);
        } else if (data.spec || (data.data && data.data.name)) {
          await handleImportCharacterFile(file);
        } else if (typeof data.name === "string" && data.description !== undefined) {
          await handleImportPersonaFile(file);
        }
      } catch (err) {
        console.error("Failed to auto-detect JSON import type:", err);
      }
    },
    [handleImportLorebookFile, handleImportCharacterFile, handleImportPersonaFile]
  );

  const handleConfirmImport = useCallback(async () => {
    if (!pendingImportRef.current) return;
    setImportLoading(true);
    try {
      const result = await pendingImportRef.current();
      await fetchLibraryData();
      setImportPreview(null);
      pendingImportRef.current = null;
      if (
        pendingTypeRef.current === "character" &&
        result &&
        typeof (result as { id: string }).id === "string"
      ) {
        navigate(`/characters/${(result as { id: string }).id}/edit`);
      }
      pendingTypeRef.current = null;
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImportLoading(false);
    }
  }, [fetchLibraryData, navigate]);

  const handleCancelImport = useCallback(() => {
    setImportPreview(null);
    pendingImportRef.current = null;
    pendingTypeRef.current = null;
  }, []);

  // Global drag-and-drop (fixed — now parses files)
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (file.name.endsWith(".png")) {
        await handleImportCharacterFile(file);
      } else if (file.name.endsWith(".json")) {
        await handleImportJsonFile(file);
      }
    },
    [handleImportCharacterFile, handleImportJsonFile]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Page header + top-level tabs */}
      <div className="px-6 pt-6 pb-0">
        <h1 className="font-heading text-2xl font-semibold text-zinc-100">
          Library
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Browse and organize your content collection.
        </p>
        <div className="mt-4 flex items-center gap-1">
          {(["my-library", "discover"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab === "my-library" ? "My Library" : "Discover"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "my-library" && (
          <MyLibrary
            libraryCharacters={libraryCharacters}
            collections={collections}
            lorebooks={lorebooks}
            personas={personas}
            sortOptions={SORT_OPTIONS}
            gridDensity={gridDensity}
            activeContentType={activeContentType}
            onChangeContentType={setActiveContentType}
            onChat={handleChat}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onChangeGridDensity={handleChangeGridDensity}
            onCreateCollection={handleCreateCollection}
            onDeleteLorebook={handleDeleteLorebook}
            onDuplicateLorebook={handleDuplicateLorebook}
            onExportLorebook={handleExportLorebook}
            onDeletePersona={handleDeletePersona}
            onDuplicatePersona={handleDuplicatePersona}
            onSetDefaultPersona={handleSetDefaultPersona}
            onEditPersona={handleEditPersona}
            onCreatePersona={handleCreatePersona}
            onImportCharacter={handleImportCharacterFile}
            onImportLorebook={handleImportLorebookFile}
            onImportPersona={handleImportPersonaFile}
          />
        )}
        {activeTab === "discover" && (
          <DiscoverFeed
            feedTabs={FEED_TABS}
            gridDensity={gridDensity}
            onImportCard={handleDiscoverImport}
          />
        )}
      </div>

      {/* Import preview modal */}
      {importPreview && (
        <ImportPreviewModal
          preview={importPreview}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
          loading={importLoading}
        />
      )}
    </div>
  );
}
