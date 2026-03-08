import { useState, useEffect, useCallback } from "react";
import { ImageIcon, Loader2, Trash2, X } from "lucide-react";
import type { Character } from "@shared/character-types";
import type { ImageGenSettings, ImageGenResult } from "@shared/image-gen-types";
import { IMAGE_GEN_DEFAULTS } from "@shared/image-gen-types";
import {
  generateImage,
  getGeneratedImageUrl,
  getImageGallery,
  deleteGeneratedImage,
  deleteAllGeneratedImages,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface ImageGenTabProps {
  character: Character & Partial<Character>;
  onChange: (updates: Partial<Character>) => void;
}

export function ImageGenTab({ character, onChange }: ImageGenTabProps) {
  const promptPrefix = character.imageGenPromptPrefix || "";
  const settings: ImageGenSettings = character.imageGenSettings || {};

  const [gallery, setGallery] = useState<ImageGenResult[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [quickPrompt, setQuickPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageGenResult | null>(null);

  // Load gallery on mount
  useEffect(() => {
    setLoadingGallery(true);
    getImageGallery(character.id)
      .then(setGallery)
      .catch(() => setGallery([]))
      .finally(() => setLoadingGallery(false));
  }, [character.id]);

  const handlePromptPrefixChange = useCallback(
    (value: string) => {
      onChange({ imageGenPromptPrefix: value || null });
    },
    [onChange],
  );

  const handleSettingsChange = useCallback(
    (updates: Partial<ImageGenSettings>) => {
      onChange({ imageGenSettings: { ...settings, ...updates } });
    },
    [onChange, settings],
  );

  const handleQuickGenerate = useCallback(async () => {
    if (!quickPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await generateImage({
        prompt: quickPrompt.trim(),
        characterId: character.id,
      });
      setGallery((prev) => [result, ...prev]);
      setQuickPrompt("");
    } catch (err) {
      console.error("Image generation failed:", err);
    }
    setGenerating(false);
  }, [quickPrompt, character.id]);

  const handleDelete = useCallback(async (imageId: string) => {
    await deleteGeneratedImage(imageId);
    setGallery((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleDeleteAll = useCallback(async () => {
    await deleteAllGeneratedImages(character.id);
    setGallery([]);
  }, [character.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Image Generation</h3>
      </div>

      {/* Prompt Prefix */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">
          Style Prompt Prefix
        </label>
        <textarea
          value={promptPrefix}
          onChange={(e) => handlePromptPrefixChange(e.target.value)}
          placeholder="anime style, detailed eyes, long silver hair, fantasy setting..."
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50 resize-none"
        />
        <p className="text-[10px] text-zinc-600">
          Automatically prepended to every image generation prompt for this character.
        </p>
      </div>

      {/* Per-character overrides */}
      <div className="space-y-4">
        <h4 className="text-xs font-medium text-zinc-400">Generation Overrides</h4>
        <p className="text-[10px] text-zinc-600">
          Leave blank to use global defaults from Settings.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">
              Steps: {settings.steps || "default"}
            </label>
            <input
              type="range"
              min={1}
              max={150}
              value={settings.steps || IMAGE_GEN_DEFAULTS.steps}
              onChange={(e) => handleSettingsChange({ steps: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">
              CFG Scale: {settings.cfgScale || "default"}
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={settings.cfgScale || IMAGE_GEN_DEFAULTS.cfgScale}
              onChange={(e) => handleSettingsChange({ cfgScale: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Width</label>
            <select
              value={settings.width || ""}
              onChange={(e) =>
                handleSettingsChange({
                  width: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 outline-none"
            >
              <option value="">Default</option>
              {[256, 512, 768, 1024, 1536].map((w) => (
                <option key={w} value={w}>
                  {w}px
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500">Height</label>
            <select
              value={settings.height || ""}
              onChange={(e) =>
                handleSettingsChange({
                  height: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 outline-none"
            >
              <option value="">Default</option>
              {[256, 512, 768, 1024, 1536].map((h) => (
                <option key={h} value={h}>
                  {h}px
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500">Negative Prompt Override</label>
          <textarea
            value={settings.negativePrompt || ""}
            onChange={(e) =>
              handleSettingsChange({ negativePrompt: e.target.value || undefined })
            }
            placeholder="Leave empty to use global default..."
            rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50 resize-none"
          />
        </div>
      </div>

      {/* Quick Generate */}
      <div className="border-t border-zinc-800 pt-4 space-y-2">
        <h4 className="text-xs font-medium text-zinc-400">Quick Generate</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleQuickGenerate();
              }
            }}
            placeholder="Describe the image..."
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
            disabled={generating}
          />
          <button
            onClick={handleQuickGenerate}
            disabled={generating || !quickPrompt.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40",
            )}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
        {promptPrefix && (
          <p className="text-[10px] text-zinc-600">
            Prefix will be applied: <span className="text-zinc-500">{promptPrefix.slice(0, 80)}{promptPrefix.length > 80 ? "..." : ""}</span>
          </p>
        )}
      </div>

      {/* Image Gallery */}
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-zinc-400">
            Generated Images ({gallery.length})
          </h4>
          {gallery.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
            >
              Delete all
            </button>
          )}
        </div>

        {loadingGallery ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading gallery...
          </div>
        ) : gallery.length === 0 ? (
          <p className="text-xs text-zinc-600">
            No images generated yet. Use Quick Generate above to create images.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50 cursor-pointer"
                onClick={() => setLightboxImage(img)}
              >
                <img
                  src={getGeneratedImageUrl(img.id)}
                  alt={img.prompt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-zinc-300 line-clamp-2">{img.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200 border border-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={getGeneratedImageUrl(lightboxImage.id)}
              alt={lightboxImage.prompt}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
            <div className="mt-2 max-w-[85vw] rounded-lg bg-zinc-900/90 px-3 py-2">
              <p className="text-xs text-zinc-300">{lightboxImage.prompt}</p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {lightboxImage.width}x{lightboxImage.height} · {lightboxImage.provider}
                {lightboxImage.seed != null ? ` · seed: ${lightboxImage.seed}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
