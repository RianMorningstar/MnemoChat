import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, FileArchive, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_EXPRESSIONS } from "@shared/expression-types";
import type { SpriteInfo } from "@shared/expression-types";
import type { Character } from "@shared/character-types";
import {
  getCharacterSprites,
  uploadSprite,
  uploadSpriteZip,
  deleteSprite as apiDeleteSprite,
  deleteAllSprites,
  getSpriteUrl,
} from "@/lib/api";

interface SpriteTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

export function SpriteTab({ character, onChange }: SpriteTabProps) {
  const [sprites, setSprites] = useState<SpriteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [cacheBust, setCacheBust] = useState(Date.now());
  const zipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSprites();
  }, [character.id]);

  async function loadSprites() {
    setLoading(true);
    try {
      const list = await getCharacterSprites(character.id);
      setSprites(list);
    } catch (err) {
      console.error("Failed to load sprites:", err);
    }
    setLoading(false);
  }

  const spriteMap = new Map(sprites.map((s) => [s.expression, s]));

  async function handleUpload(expression: string, file: File) {
    setUploading(expression);
    try {
      await uploadSprite(character.id, expression, file);
      setCacheBust(Date.now());
      await loadSprites();
    } catch (err) {
      console.error("Failed to upload sprite:", err);
    }
    setUploading(null);
  }

  async function handleDelete(expression: string) {
    try {
      await apiDeleteSprite(character.id, expression);
      setCacheBust(Date.now());
      await loadSprites();
    } catch (err) {
      console.error("Failed to delete sprite:", err);
    }
  }

  async function handleDeleteAll() {
    try {
      await deleteAllSprites(character.id);
      setConfirmDeleteAll(false);
      setCacheBust(Date.now());
      await loadSprites();
    } catch (err) {
      console.error("Failed to delete all sprites:", err);
    }
  }

  async function handleZipUpload(file: File) {
    setUploading("zip");
    try {
      await uploadSpriteZip(character.id, file);
      setCacheBust(Date.now());
      await loadSprites();
    } catch (err) {
      console.error("Failed to upload ZIP:", err);
    }
    setUploading(null);
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => zipInputRef.current?.click()}
            disabled={uploading === "zip"}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            <FileArchive className="h-4 w-4" />
            {uploading === "zip" ? "Importing..." : "Import ZIP"}
          </button>
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleZipUpload(file);
              e.target.value = "";
            }}
          />

          {sprites.length > 0 && (
            confirmDeleteAll ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete all sprites?</span>
                <button
                  onClick={handleDeleteAll}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </button>
            )
          )}
        </div>
        <span className="text-xs text-zinc-500">
          {sprites.length} / {DEFAULT_EXPRESSIONS.length} sprites
        </span>
      </div>

      {/* Default expression selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-zinc-400">Default Expression</label>
        <select
          value={character.defaultExpression || "neutral"}
          onChange={(e) => onChange({ defaultExpression: e.target.value })}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
        >
          {DEFAULT_EXPRESSIONS.map((expr) => (
            <option key={expr} value={expr}>
              {expr}
            </option>
          ))}
        </select>
      </div>

      {/* Sprite grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-500">Loading sprites...</div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {DEFAULT_EXPRESSIONS.map((expression) => {
            const sprite = spriteMap.get(expression);
            const isUploading = uploading === expression;

            return (
              <div
                key={expression}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors",
                  sprite
                    ? "border-emerald-800/50 bg-emerald-950/20"
                    : "border-zinc-800 bg-zinc-900/50"
                )}
              >
                {/* Thumbnail */}
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-zinc-800/50">
                  {sprite ? (
                    <img
                      src={`${getSpriteUrl(character.id, expression)}?t=${cacheBust}`}
                      alt={expression}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Image className="h-8 w-8 text-zinc-700" />
                  )}
                </div>

                {/* Label */}
                <span className="text-xs text-zinc-400">{expression}</span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <label
                    className={cn(
                      "cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300",
                      isUploading && "pointer-events-none opacity-50"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/png,image/webp,image/gif,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(expression, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {sprite && (
                    <button
                      onClick={() => handleDelete(expression)}
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
