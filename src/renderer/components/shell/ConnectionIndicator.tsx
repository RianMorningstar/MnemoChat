import { useState, useEffect, useRef } from "react";
import { getConnections } from "@/lib/api";
import { checkOllamaHealth } from "@/lib/ollama";
import type { ConnectionState } from "@shared/types";

interface ConnectionIndicatorProps {
  collapsed: boolean;
}

const dotColor: Record<ConnectionState, string> = {
  connected: "bg-emerald-400",
  unreachable: "bg-red-400",
  unknown: "bg-amber-400 animate-pulse",
};

export function ConnectionIndicator({ collapsed }: ConnectionIndicatorProps) {
  const [state, setState] = useState<ConnectionState>("unknown");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const profiles = await getConnections();
        const active = profiles.find((p) => p.isActive);
        if (!active || cancelled) {
          if (!cancelled) setState("unknown");
          return;
        }
        setEndpoint(active.endpoint);
        setModelName(active.defaultModel);
        const healthy = await checkOllamaHealth(active.endpoint);
        if (!cancelled) {
          setState(healthy ? "connected" : "unreachable");
        }
      } catch {
        if (!cancelled) setState("unknown");
      }
    }

    check();
    intervalRef.current = setInterval(check, 30_000);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, []);

  const label =
    state === "connected"
      ? modelName || endpoint || "Connected"
      : state === "unreachable"
        ? "Disconnected"
        : "Checking...";

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2"
      title={collapsed ? `${label} (${endpoint || "no profile"})` : undefined}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor[state]}`} />
      {!collapsed && (
        <span className="truncate text-xs text-zinc-500">{label}</span>
      )}
    </div>
  );
}
