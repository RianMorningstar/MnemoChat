import { useState, useEffect } from "react";
import { GitBranch, Trash2, X } from "lucide-react";
import { getBranches } from "@/lib/api";
import type { BranchLeaf } from "@shared/types";

interface BranchPanelProps {
  chatId: string;
  onSwitchBranch: (leafId: string) => void;
  onDeleteBranch: (messageId: string) => void;
  onClose: () => void;
}

export function BranchPanel({ chatId, onSwitchBranch, onDeleteBranch, onClose }: BranchPanelProps) {
  const [branches, setBranches] = useState<BranchLeaf[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    getBranches(chatId).then(setBranches).catch(console.error);
  }, [chatId]);

  const refreshBranches = () => {
    getBranches(chatId).then(setBranches).catch(console.error);
  };

  const handleDelete = async (leafId: string) => {
    onDeleteBranch(leafId);
    setConfirmDelete(null);
    // Refresh after a short delay to let the server process
    setTimeout(refreshBranches, 200);
  };

  return (
    <div className="flex h-full w-72 flex-col border-l border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <GitBranch className="h-4 w-4" />
          Branches
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Branch list */}
      <div className="flex-1 overflow-y-auto p-2">
        {branches.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-zinc-600">No branches yet</p>
        )}
        {branches.map((branch) => (
          <div
            key={branch.leafId}
            className={`group relative mb-1 cursor-pointer rounded-lg px-3 py-2 transition-colors ${
              branch.isActive
                ? "bg-indigo-500/10 border border-indigo-500/30"
                : "hover:bg-zinc-800 border border-transparent"
            }`}
            onClick={() => onSwitchBranch(branch.leafId)}
          >
            <div className="flex items-center gap-2">
              <GitBranch className={`h-3 w-3 ${branch.isActive ? "text-indigo-400" : "text-zinc-600"}`} />
              <span className={`text-xs font-medium ${branch.isActive ? "text-indigo-300" : "text-zinc-400"}`}>
                {branch.depth} messages
              </span>
              {branch.isActive && (
                <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-medium text-indigo-400">
                  active
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              {branch.lastContent || "(empty)"}
            </p>
            <p className="mt-0.5 text-[9px] text-zinc-600">
              {new Date(branch.leafTimestamp).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            {/* Delete button */}
            {!branch.isActive && branches.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirmDelete === branch.leafId) {
                    handleDelete(branch.leafId);
                  } else {
                    setConfirmDelete(branch.leafId);
                  }
                }}
                className={`absolute right-2 top-2 rounded p-1 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 ${
                  confirmDelete === branch.leafId
                    ? "bg-red-500/20 text-red-400 opacity-100"
                    : "hover:bg-red-500/10 hover:text-red-400"
                }`}
                title={confirmDelete === branch.leafId ? "Click again to confirm" : "Delete branch"}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
