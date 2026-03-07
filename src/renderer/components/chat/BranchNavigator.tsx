import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";

interface BranchNavigatorProps {
  currentIndex: number;
  totalSiblings: number;
  onNavigate: (direction: "prev" | "next") => void;
}

export function BranchNavigator({ currentIndex, totalSiblings, onNavigate }: BranchNavigatorProps) {
  if (totalSiblings <= 1) return null;

  return (
    <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
      <GitBranch className="h-3 w-3" />
      <button
        onClick={() => onNavigate("prev")}
        disabled={currentIndex <= 0}
        className="rounded p-0.5 transition-colors hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <span className="tabular-nums">
        {currentIndex + 1} / {totalSiblings}
      </span>
      <button
        onClick={() => onNavigate("next")}
        disabled={currentIndex >= totalSiblings - 1}
        className="rounded p-0.5 transition-colors hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
