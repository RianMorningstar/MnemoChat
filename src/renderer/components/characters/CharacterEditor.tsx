import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character, LorebookEntry } from "@shared/character-types";
import { BasicTab } from "./BasicTab";
import { PromptEngineeringTab } from "./PromptEngineeringTab";
import { LorebookTab } from "./LorebookTab";
import { MetaTab } from "./MetaTab";

type TabId = "basic" | "prompts" | "lorebook" | "meta";

interface CharacterEditorProps {
  character: Character;
  lorebookEntries: LorebookEntry[];
  onSave: (updates: Partial<Character>) => void;
  onBack: () => void;
  onCreateLorebookEntry: () => void;
  onUpdateLorebookEntry: (id: string, updates: Partial<LorebookEntry>) => void;
  onDeleteLorebookEntry: (id: string) => void;
  onToggleLorebookEntry: (id: string) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "prompts", label: "Prompt Engineering" },
  { id: "lorebook", label: "Lorebook" },
  { id: "meta", label: "Meta" },
];

export function CharacterEditor({
  character,
  lorebookEntries,
  onSave,
  onBack,
  onCreateLorebookEntry,
  onUpdateLorebookEntry,
  onDeleteLorebookEntry,
  onToggleLorebookEntry,
}: CharacterEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [draft, setDraft] = useState<Partial<Character>>({});
  const [dirty, setDirty] = useState(false);

  const merged: Character = { ...character, ...draft };

  function handleChange(updates: Partial<Character>) {
    setDraft((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  }

  function handleSave() {
    if (dirty) {
      onSave(draft);
      setDraft({});
      setDirty(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">
            {merged.name || "Untitled Character"}
          </h1>
          {dirty && (
            <span className="rounded bg-amber-600/20 px-2 py-0.5 text-xs text-amber-400">
              Unsaved
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium",
            dirty
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-indigo-400"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {tab.label}
            {tab.id === "lorebook" && lorebookEntries.length > 0 && (
              <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                {lorebookEntries.length}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === "basic" && (
          <BasicTab character={merged} onChange={handleChange} />
        )}
        {activeTab === "prompts" && (
          <PromptEngineeringTab character={merged} onChange={handleChange} />
        )}
        {activeTab === "lorebook" && (
          <LorebookTab
            entries={lorebookEntries}
            onCreate={onCreateLorebookEntry}
            onUpdate={onUpdateLorebookEntry}
            onDelete={onDeleteLorebookEntry}
            onToggle={onToggleLorebookEntry}
          />
        )}
        {activeTab === "meta" && (
          <MetaTab character={merged} onChange={handleChange} />
        )}
      </div>
    </div>
  );
}
