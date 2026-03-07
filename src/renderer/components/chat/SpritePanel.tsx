import { useState, useEffect, useRef } from "react";
import { X, Ghost } from "lucide-react";
import { getCharacterSprites, getSpriteUrl } from "@/lib/api";
import type { SpriteInfo } from "@shared/expression-types";

interface SpritePanelProps {
  characterId: string;
  characterName: string;
  expression: string | null;
  defaultExpression: string;
  onClose: () => void;
}

export function SpritePanel({
  characterId,
  characterName,
  expression,
  defaultExpression,
  onClose,
}: SpritePanelProps) {
  const [sprites, setSprites] = useState<SpriteInfo[]>([]);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  // Load sprites when character changes
  useEffect(() => {
    let cancelled = false;
    getCharacterSprites(characterId)
      .then((list) => {
        if (!cancelled) setSprites(list);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [characterId]);

  // Resolve the current sprite URL based on expression
  useEffect(() => {
    if (sprites.length === 0) {
      setActiveUrl(null);
      return;
    }

    const spriteSet = new Set(sprites.map((s) => s.expression));
    const resolved =
      (expression && spriteSet.has(expression) && expression) ||
      (spriteSet.has(defaultExpression) && defaultExpression) ||
      (spriteSet.has("neutral") && "neutral") ||
      sprites[0]?.expression ||
      null;

    const newUrl = resolved
      ? getSpriteUrl(characterId, resolved)
      : null;

    if (newUrl !== prevUrlRef.current) {
      setFading(true);
      const timer = setTimeout(() => {
        setActiveUrl(newUrl);
        prevUrlRef.current = newUrl;
        setFading(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [expression, sprites, characterId, defaultExpression]);

  // Derive the displayed expression name
  const spriteSet = new Set(sprites.map((s) => s.expression));
  const displayedExpression =
    (expression && spriteSet.has(expression) && expression) ||
    (spriteSet.has(defaultExpression) && defaultExpression) ||
    (spriteSet.has("neutral") && "neutral") ||
    null;

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/50">
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-3">
        <span className="text-xs font-medium text-zinc-400">{characterName}</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sprite display */}
      <div className="flex flex-1 flex-col items-center justify-end overflow-hidden p-4">
        {sprites.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-zinc-600">
            <Ghost className="h-12 w-12" />
            <span className="text-xs">No sprites uploaded</span>
          </div>
        ) : activeUrl ? (
          <img
            src={activeUrl}
            alt={displayedExpression || "sprite"}
            className="max-h-full max-w-full object-contain transition-opacity duration-200"
            style={{ opacity: fading ? 0 : 1 }}
          />
        ) : null}
      </div>

      {/* Expression label */}
      {displayedExpression && (
        <div className="flex justify-center border-t border-zinc-800 py-2">
          <span className="rounded-full bg-zinc-800 px-3 py-0.5 text-xs text-zinc-400">
            {displayedExpression}
          </span>
        </div>
      )}
    </div>
  );
}
