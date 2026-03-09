import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, ImageIcon, Loader2, Trash2, Sparkles, UserCircle, Copy } from "lucide-react";
import {
  generateImage,
  getGeneratedImageUrl,
  getChatImageGallery,
  deleteGeneratedImage,
  setPortraitFromGeneratedImage,
} from "@/lib/api";
import type { ImageGenResult } from "@shared/image-gen-types";
import { cn } from "@/lib/utils";

interface ImageGenPanelProps {
  chatId: string;
  characterId: string;
  characterName: string;
  promptPrefix?: string | null;
  onClose: () => void;
  onImageGenerated?: (result: ImageGenResult) => void;
  onPortraitSet?: (portraitUrl: string) => void;
}

export function ImageGenPanel({
  chatId,
  characterId,
  characterName,
  promptPrefix,
  onClose,
  onImageGenerated,
  onPortraitSet,
}: ImageGenPanelProps) {
  const [gallery, setGallery] = useState<ImageGenResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageGenResult | null>(null);
  const { t } = useTranslation('chat');

  // Load chat gallery
  useEffect(() => {
    setLoading(true);
    getChatImageGallery(chatId)
      .then(setGallery)
      .catch(() => setGallery([]))
      .finally(() => setLoading(false));
  }, [chatId]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const result = await generateImage({
        prompt: prompt.trim(),
        characterId,
        chatId,
      });
      setGallery((prev) => [result, ...prev]);
      setPrompt("");
      onImageGenerated?.(result);
    } catch (err) {
      console.error("Image generation failed:", err);
    }
    setGenerating(false);
  }, [prompt, characterId, chatId, onImageGenerated]);

  const handleDelete = useCallback(async (imageId: string) => {
    await deleteGeneratedImage(imageId);
    setGallery((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const [portraitFlash, setPortraitFlash] = useState<string | null>(null);

  const handleSetPortrait = useCallback(async (imageId: string) => {
    try {
      const { portraitUrl } = await setPortraitFromGeneratedImage(imageId);
      onPortraitSet?.(portraitUrl);
      setPortraitFlash(imageId);
      setTimeout(() => setPortraitFlash(null), 1500);
    } catch (err) {
      console.error("Failed to set portrait:", err);
    }
  }, [onPortraitSet]);

  const handleCopyPrompt = useCallback((img: ImageGenResult) => {
    setPrompt(img.prompt);
    setLightboxImage(null);
  }, []);

  return (
    <>
      <div className="flex w-[320px] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/50">
        {/* Header */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-3">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-zinc-400">{t('imageGen.title')}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Prompt input */}
        <div className="border-b border-zinc-800 p-3 space-y-2">
          {promptPrefix && (
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400/60" />
              <span className="text-[10px] text-indigo-400/60 truncate" title={promptPrefix}>
                {promptPrefix.slice(0, 60)}{promptPrefix.length > 60 ? "..." : ""}
              </span>
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={t('imageGen.placeholder')}
              disabled={generating}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800/50 px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40",
              )}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {generating && (
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              {t('imageGen.generating')}
            </p>
          )}
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('imageGen.loading')}
            </div>
          ) : gallery.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
              <ImageIcon className="h-8 w-8" />
              <span className="text-xs">{t('imageGen.empty')}</span>
              <span className="text-[10px]">{t('imageGen.emptyHint')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
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
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPortrait(img.id);
                      }}
                      title={t('imageGen.setAsPortrait')}
                      className="rounded-full bg-black/60 p-0.5 text-indigo-400 hover:text-indigo-300"
                    >
                      <UserCircle className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPrompt(img);
                      }}
                      title={t('imageGen.copyPrompt')}
                      className="rounded-full bg-black/60 p-0.5 text-zinc-400 hover:text-zinc-200"
                    >
                      <Copy className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id);
                      }}
                      title={t('message.delete')}
                      className="rounded-full bg-black/60 p-0.5 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  {portraitFlash === img.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                      <span className="text-[9px] font-medium text-indigo-300">{t('imageGen.portraitSet')}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[8px] text-zinc-300 line-clamp-2">{img.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
              className="absolute -top-3 -right-3 rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-zinc-200 border border-zinc-600 z-10"
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
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSetPortrait(lightboxImage.id)}
                  className="flex items-center gap-1 rounded-md bg-indigo-600/80 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  <UserCircle className="h-3 w-3" />
                  {t('imageGen.setAsPortrait')}
                </button>
                <button
                  onClick={() => handleCopyPrompt(lightboxImage)}
                  className="flex items-center gap-1 rounded-md bg-zinc-700/80 px-2.5 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-600 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {t('imageGen.copyPrompt')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
