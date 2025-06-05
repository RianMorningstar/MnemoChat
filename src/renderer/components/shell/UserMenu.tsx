import { ChevronUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  persona?: {
    name: string;
    avatarUrl?: string;
  };
  collapsed: boolean;
  onLogout?: () => void;
}

export function UserMenu({ persona, collapsed, onLogout }: UserMenuProps) {
  const displayName = persona?.name || "Default Persona";

  return (
    <div className="px-2 pb-3">
      <button
        onClick={onLogout}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100",
        )}
        title={collapsed ? displayName : undefined}
      >
        {persona?.avatarUrl ? (
          <img
            src={persona.avatarUrl}
            alt={displayName}
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-zinc-600"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 ring-1 ring-zinc-600">
            <User className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 text-left">
              <p className="truncate text-sm font-medium text-zinc-200">
                {displayName}
              </p>
              <p className="text-xs text-zinc-500">Persona</p>
            </div>
            <ChevronUp
              className="h-4 w-4 shrink-0 text-zinc-500"
              strokeWidth={1.5}
            />
          </>
        )}
      </button>
    </div>
  );
}
