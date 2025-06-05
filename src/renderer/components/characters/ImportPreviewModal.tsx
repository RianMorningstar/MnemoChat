import { X, User } from "lucide-react";
import type { ImportPreview } from "@shared/character-types";

interface ImportPreviewModalProps {
  preview: ImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreviewModal({
  preview,
  onConfirm,
  onCancel,
}: ImportPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Import Character
          </h2>
          <button
            onClick={onCancel}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview content */}
        <div className="p-5">
          <div className="flex gap-4">
            {/* Portrait */}
            <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
              {preview.portraitUrl ? (
                <img
                  src={preview.portraitUrl}
                  alt={preview.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-10 w-10 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-base font-medium text-zinc-100">
                {preview.name}
              </h3>
              {preview.creatorName && (
                <p className="text-xs text-zinc-500">
                  by {preview.creatorName}
                </p>
              )}
              {preview.description && (
                <p className="line-clamp-3 text-sm text-zinc-400">
                  {preview.description}
                </p>
              )}
              {preview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {preview.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {preview.tokenCount > 0 && (
                <p className="text-xs text-zinc-500">
                  ~{preview.tokenCount.toLocaleString()} tokens
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
