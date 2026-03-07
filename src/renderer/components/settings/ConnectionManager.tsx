import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Plus, Zap, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import type { ConnectionProfile, ConnectionState, ProviderType } from "@shared/types";
import {
  PROVIDER_LABELS,
  PROVIDER_DEFAULT_ENDPOINTS,
  PROVIDER_REQUIRES_API_KEY,
} from "@shared/types";
import {
  getConnections,
  createConnection,
  deleteConnection,
  activateConnection,
} from "@/lib/api";
import { checkProviderHealth } from "@/lib/ollama";

const PROVIDER_OPTIONS: ProviderType[] = ["ollama", "lm-studio", "openai", "groq", "anthropic"];

interface ProfileStatus {
  state: ConnectionState;
  testing: boolean;
}

export function ConnectionManager() {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ProfileStatus>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ProviderType>("ollama");
  const [newEndpoint, setNewEndpoint] = useState("http://localhost:11434");
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    const data = await getConnections();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleTypeChange = (type: ProviderType) => {
    setNewType(type);
    setNewEndpoint(PROVIDER_DEFAULT_ENDPOINTS[type]);
    setNewApiKey("");
  };

  const handleTest = async (profile: ConnectionProfile) => {
    setStatuses((s) => ({
      ...s,
      [profile.id]: { state: "unknown", testing: true },
    }));
    const healthy = await checkProviderHealth(
      profile.endpoint,
      profile.type,
      profile.apiKey ?? undefined
    );
    setStatuses((s) => ({
      ...s,
      [profile.id]: {
        state: healthy ? "connected" : "unreachable",
        testing: false,
      },
    }));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection(id);
      setConfirmDeleteId(null);
      await loadProfiles();
    } catch (err) {
      console.error("Failed to delete connection:", err);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateConnection(id);
      await loadProfiles();
    } catch (err) {
      console.error("Failed to activate connection:", err);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newEndpoint.trim()) return;
    const requiresKey = PROVIDER_REQUIRES_API_KEY[newType];
    if (requiresKey && !newApiKey.trim()) return;
    try {
      await createConnection({
        id: crypto.randomUUID(),
        name: newName.trim(),
        type: newType,
        endpoint: newEndpoint.trim(),
        apiKey: newApiKey.trim() || undefined,
      });
      setNewName("");
      setNewType("ollama");
      setNewEndpoint(PROVIDER_DEFAULT_ENDPOINTS["ollama"]);
      setNewApiKey("");
      setShowAdd(false);
      await loadProfiles();
    } catch (err) {
      console.error("Failed to add connection:", err);
    }
  };

  const requiresKey = PROVIDER_REQUIRES_API_KEY[newType];
  const canSave =
    newName.trim() &&
    newEndpoint.trim() &&
    (!requiresKey || newApiKey.trim());

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading connections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.length === 0 && !showAdd && (
        <p className="text-sm text-zinc-500">No connection profiles yet.</p>
      )}

      {profiles.map((profile) => {
        const status = statuses[profile.id];
        const providerLabel = PROVIDER_LABELS[profile.type] ?? profile.type;
        return (
          <div
            key={profile.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  status?.state === "connected"
                    ? "bg-emerald-400"
                    : status?.state === "unreachable"
                      ? "bg-red-400"
                      : "bg-zinc-600"
                }`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {profile.name}
                  </span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {providerLabel}
                  </span>
                  {profile.isActive && (
                    <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                      Active
                    </span>
                  )}
                </div>
                <p
                  className="truncate text-xs text-zinc-500"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {profile.endpoint}
                  {profile.defaultModel && ` / ${profile.defaultModel}`}
                  {profile.apiKey && " · key set"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => handleTest(profile)}
                disabled={status?.testing}
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                title="Test connection"
              >
                {status?.testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status?.state === "connected" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : status?.state === "unreachable" ? (
                  <XCircle className="h-4 w-4 text-red-400" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
              </button>

              {!profile.isActive && (
                <button
                  onClick={() => handleActivate(profile.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Set Active
                </button>
              )}

              {confirmDeleteId === profile.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(profile.id)}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {showAdd ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 space-y-3">
          {/* Provider type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Provider
            </label>
            <select
              value={newType}
              onChange={(e) => handleTypeChange(e.target.value as ProviderType)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500"
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Profile name */}
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Profile name"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500"
          />

          {/* Endpoint */}
          <input
            type="text"
            value={newEndpoint}
            onChange={(e) => setNewEndpoint(e.target.value)}
            placeholder={PROVIDER_DEFAULT_ENDPOINTS[newType]}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />

          {/* API key (cloud providers only) */}
          {requiresKey && (
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="API key"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-500"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!canSave}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewName("");
                setNewType("ollama");
                setNewEndpoint(PROVIDER_DEFAULT_ENDPOINTS["ollama"]);
                setNewApiKey("");
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 px-4 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        >
          <Plus className="h-4 w-4" />
          Add Profile
        </button>
      )}
    </div>
  );
}
