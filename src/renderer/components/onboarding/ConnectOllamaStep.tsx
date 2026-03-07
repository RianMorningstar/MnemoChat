import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ConnectionState, ProviderType } from "@shared/types";
import {
  PROVIDER_LABELS,
  PROVIDER_DEFAULT_ENDPOINTS,
  PROVIDER_REQUIRES_API_KEY,
} from "@shared/types";

const PROVIDER_OPTIONS: ProviderType[] = ["ollama", "lm-studio", "openai", "groq", "anthropic"];

interface ConnectOllamaStepProps {
  connectionState: ConnectionState;
  detectedEndpoint: string | null;
  modelCount: number;
  onConnect?: (endpoint: string, type: ProviderType, apiKey: string | null) => void;
  onNext?: () => void;
}

export function ConnectOllamaStep({
  connectionState,
  detectedEndpoint,
  modelCount,
  onConnect,
  onNext,
}: ConnectOllamaStepProps) {
  const [selectedType, setSelectedType] = useState<ProviderType>("ollama");
  const [manualUrl, setManualUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const isConnected = connectionState === "connected";
  const isChecking = connectionState === "unknown";
  const requiresKey = PROVIDER_REQUIRES_API_KEY[selectedType];
  const isLocal = selectedType === "ollama" || selectedType === "lm-studio";

  const handleTypeChange = (type: ProviderType) => {
    setSelectedType(type);
    setManualUrl(PROVIDER_DEFAULT_ENDPOINTS[type]);
    setApiKey("");
  };

  const handleConnect = () => {
    const endpoint = manualUrl.trim() || PROVIDER_DEFAULT_ENDPOINTS[selectedType];
    onConnect?.(endpoint, selectedType, apiKey.trim() || null);
  };

  const canConnect = !requiresKey || apiKey.trim().length > 0;

  return (
    <div className="flex flex-col items-center">
      <h2
        className="mb-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        Connect to an AI Provider
      </h2>
      <p className="mb-8 text-zinc-500">
        MnemoChat needs an AI backend to generate responses.
      </p>

      {/* Provider selector */}
      <div className="mb-6 w-full max-w-md">
        <label className="mb-2 block text-xs font-medium text-zinc-400">
          Provider
        </label>
        <div className="flex flex-wrap gap-2">
          {PROVIDER_OPTIONS.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedType === type
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {PROVIDER_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
        {/* Endpoint URL */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            {isLocal ? "Endpoint URL" : "API Base URL"}
          </label>
          <input
            type="text"
            value={manualUrl || PROVIDER_DEFAULT_ENDPOINTS[selectedType]}
            onChange={(e) => setManualUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        {/* API key (cloud providers) */}
        {requiresKey && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`${PROVIDER_LABELS[selectedType]} API key`}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Connection status */}
        {isChecking && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" strokeWidth={1.5} />
            <p className="text-sm text-zinc-400">Checking connection…</p>
          </div>
        )}

        {isConnected && (
          <div className="flex items-center gap-3 py-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-zinc-100">Connected</p>
              {modelCount > 0 && (
                <p className="text-xs text-zinc-500">
                  {modelCount} model{modelCount !== 1 ? "s" : ""} available
                </p>
              )}
            </div>
          </div>
        )}

        {connectionState === "unreachable" && (
          <div className="flex items-center gap-3 py-2">
            <XCircle className="h-5 w-5 text-red-400" strokeWidth={1.5} />
            <p className="text-sm text-zinc-400">
              {isLocal
                ? "Couldn't reach the endpoint. Make sure the service is running."
                : "Couldn't connect. Check your API key and endpoint."}
            </p>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={!canConnect || isChecking}
          className="w-full rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isChecking ? "Checking…" : "Test Connection"}
        </button>
      </div>

      <button
        onClick={onNext}
        disabled={!isConnected}
        className={`mt-10 rounded-lg px-8 py-3 text-sm font-medium transition-all duration-200 ${
          isConnected
            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        }`}
      >
        Continue
      </button>
    </div>
  );
}
