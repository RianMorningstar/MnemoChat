import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { MyLibrary } from "@/components/library/MyLibrary";
import { DiscoverFeed } from "@/components/library/DiscoverFeed";
import {
  getLibraryCharacters,
  getCollections,
  getLibraryLorebooks,
  getPersonas,
  getDiscoverCards,
  createCollection,
  deleteCollection,
  deleteCharacter,
  duplicateCharacter,
  deleteLibraryLorebook,
  duplicateLibraryLorebook,
  exportLorebook,
  deletePersona,
  duplicatePersona,
  setDefaultPersona,
  createPersona,
  importDiscoverCard,
  likeDiscoverCard,
  seedDiscoverData,
  getSetting,
  setSetting,
  createCharacter,
  bulkDeleteCharacters,
} from "@/lib/api";
import type {
  LibraryCharacter,
  Collection,
  LibraryLorebook,
  Persona,
  DiscoverCard,
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
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<LibraryTab>("my-library");
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
  const [discoverCards, setDiscoverCards] = useState<DiscoverCard[]>([]);

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

  const fetchDiscoverData = useCallback(async () => {
    try {
      const cards = await getDiscoverCards();
      setDiscoverCards(cards);
    } catch (err) {
      console.error("Failed to fetch discover data:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      // Load grid density from settings
      try {
        const setting = await getSetting("grid_density");
        if (setting?.value) {
          setGridDensity(setting.value as GridDensity);
        }
      } catch {}

      // Seed discover data if needed
      try {
        const seeded = await getSetting("discover_seeded");
        if (!seeded) {
          await seedDiscoverData();
          await setSetting("discover_seeded", "true");
        }
      } catch {}

      await Promise.all([fetchLibraryData(), fetchDiscoverData()]);
      setLoading(false);
    }
    init();
  }, [fetchLibraryData, fetchDiscoverData]);

  // Grid density persistence
  const handleChangeGridDensity = useCallback(
    (density: GridDensity) => {
      setGridDensity(density);
      setSetting("grid_density", density).catch(() => {});
    },
    []
  );

  // Character actions
  const handleChat = useCallback(
    (id: string) => navigate(`/chat?character=${id}`),
    [navigate]
  );

  const handleEdit = useCallback(
    (id: string) => navigate(`/characters/${id}/edit`),
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteCharacter(id);
        setLibraryCharacters((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error("Failed to delete character:", err);
      }
    },
    []
  );

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
  const handleCreateCollection = useCallback(
    async (name: string) => {
      try {
        const col = await createCollection({ name });
        setCollections((prev) => [...prev, col]);
      } catch (err) {
        console.error("Failed to create collection:", err);
      }
    },
    []
  );

  const handleDeleteCollection = useCallback(
    async (id: string) => {
      try {
        await deleteCollection(id);
        setCollections((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error("Failed to delete collection:", err);
      }
    },
    []
  );

  // Lorebook actions
  const handleDeleteLorebook = useCallback(
    async (id: string) => {
      try {
        await deleteLibraryLorebook(id);
        setLorebooks((prev) => prev.filter((lb) => lb.id !== id));
      } catch (err) {
        console.error("Failed to delete lorebook:", err);
      }
    },
    []
  );

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
  const handleDeletePersona = useCallback(
    async (id: string) => {
      try {
        await deletePersona(id);
        setPersonas((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error("Failed to delete persona:", err);
      }
    },
    []
  );

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

  const handleCreatePersona = useCallback(
    async () => {
      try {
        const persona = await createPersona({ name: "New Persona" });
        navigate(`/personas/${persona.id}/edit`);
      } catch (err) {
        console.error("Failed to create persona:", err);
      }
    },
    [navigate]
  );

  // Discover actions
  const handleImportCard = useCallback(
    async (cardId: string) => {
      try {
        await importDiscoverCard(cardId);
        await fetchLibraryData();
        await fetchDiscoverData();
      } catch (err) {
        console.error("Failed to import card:", err);
      }
    },
    [fetchLibraryData, fetchDiscoverData]
  );

  const handleLikeCard = useCallback(
    async (cardId: string) => {
      try {
        await likeDiscoverCard(cardId);
        await fetchDiscoverData();
      } catch (err) {
        console.error("Failed to like card:", err);
      }
    },
    [fetchDiscoverData]
  );

  // Drag-and-drop PNG import
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.name.endsWith(".png")) return;

      try {
        const char = await createCharacter({
          name: file.name.replace(".png", ""),
          importDate: new Date().toISOString(),
        });
        await fetchLibraryData();
        navigate(`/characters/${char.id}/edit`);
      } catch (err) {
        console.error("Failed to import PNG:", err);
      }
    },
    [fetchLibraryData, navigate]
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
          />
        )}
        {activeTab === "discover" && (
          <DiscoverFeed
            cards={discoverCards}
            feedTabs={FEED_TABS}
            gridDensity={gridDensity}
            onImportCard={handleImportCard}
            onLikeCard={handleLikeCard}
          />
        )}
      </div>
    </div>
  );
}
