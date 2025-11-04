import { useState, useRef, useEffect } from "react";
import { ChevronUp, User, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Persona } from "@shared/library-types";

interface UserMenuProps {
  persona?: {
    name: string;
    avatarUrl?: string;
  };
  personas?: Persona[];
  collapsed: boolean;
  onSwitchPersona?: (id: string) => void;
  onCreatePersona?: () => void;
}

export function UserMenu({
  persona,
  personas = [],
  collapsed,
  onSwitchPersona,
  onCreatePersona,
}: UserMenuProps) {
  const displayName = persona?.name || "Default Persona";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative px-2 pb-3" ref={menuRef}>
      {/* Dropdown */}
      {open && !collapsed && personas.length > 0 && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
          <div className="px-3 py-1.5 text-xs font-medium text-zinc-500">
            Switch Persona
          </div>
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSwitchPersona?.(p.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-700/60"
            >
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt={p.name}
                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                  <User className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
                </div>
              )}
              <span className="flex-1 truncate">{p.name}</span>
              {p.isDefault && (
                <Check className="h-4 w-4 shrink-0 text-indigo-400" strokeWidth={2} />
              )}
            </button>
          ))}
          <div className="mx-2 my-1 border-t border-zinc-700" />
          <button
            onClick={() => {
              onCreatePersona?.();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-200"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Create new persona</span>
          </button>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
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
              className={cn(
                "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={1.5}
            />
          </>
        )}
      </button>
    </div>
  );
}
