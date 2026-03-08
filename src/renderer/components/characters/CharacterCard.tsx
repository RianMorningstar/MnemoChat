import { useState } from "react";
import { User, MessageSquare, Pencil, Copy, Download, FileJson, ImageIcon, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character } from "@shared/character-types";

interface CharacterCardProps {
  character: Character;
  selected?: boolean;
  onChat: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string, format: "png" | "json") => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;
  bulkMode?: boolean;
}

export function CharacterCard({
  character,
  selected,
  onChat,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onSelect,
  bulkMode,
}: CharacterCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg",
        selected && "ring-2 ring-indigo-500"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      {/* Portrait area */}
      <div
        className="relative h-56 w-full cursor-pointer bg-zinc-800"
        onClick={() => (bulkMode && onSelect ? onSelect(character.id) : onEdit(character.id))}
      >
        {character.portraitUrl ? (
          <img
            src={character.portraitUrl}
            alt={character.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-16 w-16 text-zinc-600" />
          </div>
        )}

        {/* Hover actions overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onChat(character.id); }}
            className="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-500"
            title="Chat"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(character.id); }}
            className="rounded-full bg-zinc-700 p-2 text-white hover:bg-zinc-600"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="rounded-full bg-zinc-700 p-2 text-white hover:bg-zinc-600"
            title="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk selection checkbox */}
        {bulkMode && (
          <div className="absolute left-2 top-2">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect?.(character.id)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
            />
          </div>
        )}

        {/* Content tier badge */}
        {character.contentTier === "nsfw" && (
          <span className="absolute right-2 top-2 rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            NSFW
          </span>
        )}
      </div>

      {/* Name overlay */}
      <div className="border-t border-zinc-800 px-3 py-2">
        <p className="truncate text-sm font-medium text-zinc-200">
          {character.name}
        </p>
        {character.tags.length > 0 && (
          <div className="mt-1 flex gap-1 overflow-hidden">
            {character.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="truncate rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 2 && (
              <span className="text-[10px] text-zinc-500">
                +{character.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Context menu dropdown */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-2 top-2 z-50 w-40 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
            {[
              { label: "Chat", icon: MessageSquare, action: () => onChat(character.id) },
              { label: "Edit", icon: Pencil, action: () => onEdit(character.id) },
              { label: "Duplicate", icon: Copy, action: () => onDuplicate(character.id) },
              { label: "Export as JSON", icon: FileJson, action: () => onExport(character.id, "json") },
              { label: "Export as PNG", icon: ImageIcon, action: () => onExport(character.id, "png") },
              { label: "Delete", icon: Trash2, action: () => onDelete(character.id), danger: true },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setShowMenu(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm",
                  "danger" in item && item.danger
                    ? "text-red-400 hover:bg-red-900/30"
                    : "text-zinc-300 hover:bg-zinc-700"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
