import { BookOpen, Loader2, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImportPreview =
  | {
      type: "character";
      name: string;
      tags: string[];
      description: string | null;
      portraitDataUrl: string | null;
    }
  | {
      type: "lorebook";
      name: string;
      tags: string[];
      entryCount: number;
      coverColor: string;
    }
  | {
      type: "persona";
      name: string;
      description: string;
      avatarUrl: string;
    };

interface ImportPreviewModalProps {
  preview: ImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ImportPreviewModal({
  preview,
  onConfirm,
  onCancel,
  loading = false,
}: ImportPreviewModalProps) {
  const title =
    preview.type === "character"
      ? "Import Character"
      : preview.type === "lorebook"
        ? "Import Lorebook"
        : "Import Persona";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700/50 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            <Upload className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        </div>

        {/* Preview */}
        <div className="p-5">
          {preview.type === "character" && (
            <CharacterPreview preview={preview} />
          )}
          {preview.type === "lorebook" && (
            <LorebookPreview preview={preview} />
          )}
          {preview.type === "persona" && (
            <PersonaPreview preview={preview} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CharacterPreview({
  preview,
}: {
  preview: Extract<ImportPreview, { type: "character" }>;
}) {
  return (
    <div className="flex gap-4">
      {/* Portrait */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800">
        {preview.portraitDataUrl ? (
          <img
            src={preview.portraitDataUrl}
            alt={preview.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <User className="h-6 w-6 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-100">
          {preview.name}
        </h3>
        {preview.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {preview.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {preview.description && (
          <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-zinc-400">
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );
}

function LorebookPreview({
  preview,
}: {
  preview: Extract<ImportPreview, { type: "lorebook" }>;
}) {
  return (
    <div className="flex gap-4">
      {/* Icon */}
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl",
          preview.coverColor === "indigo" && "bg-indigo-500/15 text-indigo-400",
          preview.coverColor === "teal" && "bg-teal-500/15 text-teal-400",
          preview.coverColor === "amber" && "bg-amber-500/15 text-amber-400",
          preview.coverColor === "rose" && "bg-rose-500/15 text-rose-400",
          (preview.coverColor === "zinc" || !preview.coverColor) &&
            "bg-zinc-700/50 text-zinc-400"
        )}
      >
        <BookOpen className="h-7 w-7" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-100">
          {preview.name}
        </h3>
        <p className="mt-1 text-[11px] tabular-nums text-zinc-500">
          {preview.entryCount} {preview.entryCount === 1 ? "entry" : "entries"}
        </p>
        {preview.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {preview.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaPreview({
  preview,
}: {
  preview: Extract<ImportPreview, { type: "persona" }>;
}) {
  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800">
        {preview.avatarUrl ? (
          <img
            src={preview.avatarUrl}
            alt={preview.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-900/40 to-zinc-900/80">
            <span className="text-3xl font-bold text-zinc-500/60">
              {preview.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-zinc-100">
          {preview.name}
        </h3>
        {preview.description && (
          <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-zinc-400">
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );
}
