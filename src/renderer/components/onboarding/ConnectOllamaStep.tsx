import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import type { ConnectionState } from "@shared/types";

interface ConnectOllamaStepProps {
  connectionState: ConnectionState;
  detectedEndpoint: string | null;
  modelCount: number;
  onConnect?: (endpoint: string) => void;
  onNext?: () => void;
}

export function ConnectOllamaStep({
  connectionState,
  detectedEndpoint,
  modelCount,
  onConnect,
  onNext,
}: ConnectOllamaStepProps) {
  const [manualUrl, setManualUrl] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  const isConnected = connectionState === "connected";
  const isChecking = connectionState === "unknown";

  return (
    <div className="flex flex-col items-center">
      <h2
        className="mb-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        Connect to Ollama
      </h2>
      <p className="mb-10 text-zinc-500">
        MnemoChat needs a running Ollama instance to generate responses.
      </p>

      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
        {isChecking && (
          <div className="flex flex-col items-center py-4">
            <Loader2
              className="mb-4 h-10 w-10 animate-spin text-indigo-400"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-zinc-300">
              Looking for Ollama...
            </p>
            <p
              className="mt-1 text-xs text-zinc-500"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              localhost:11434
            </p>
          </div>
        )}

        {isConnected && (
          <div className="flex flex-col items-center py-4">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2
                className="h-8 w-8 text-emerald-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-sm font-medium text-zinc-100">
              Ollama found at{" "}
              <span
                className="text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {detectedEndpoint}
              </span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {modelCount} model{modelCount !== 1 ? "s" : ""} available
            </p>
          </div>
        )}

        {connectionState === "unreachable" && (
          <div className="flex flex-col items-center py-4">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <XCircle
                className="h-8 w-8 text-red-400"
                strokeWidth={1.5}
              />
            </div>
            <p className="mb-1 text-sm font-medium text-zinc-100">
              Couldn't reach Ollama
            </p>
            <p className="mb-6 text-center text-xs text-zinc-500">
              Make sure Ollama is running:{" "}
              <code
                className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ollama serve
              </code>
            </p>

            <div className="w-full">
              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Or enter a custom address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="http://192.168.1.42:11434"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
                <button
                  onClick={() =>
                    onConnect?.(manualUrl || "http://localhost:11434")
                  }
                  className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-6">
        <button
          onClick={() => setShowTooltip((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
          What is Ollama?
        </button>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 mb-2 w-72 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-800 p-4 shadow-xl">
            <p className="mb-2 text-xs leading-relaxed text-zinc-300">
              Ollama is a local LLM runner that lets you download and run AI
              models on your own hardware. MnemoChat connects to it to power
              all text generation.
            </p>
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
            >
              ollama.com
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
            <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-zinc-700 bg-zinc-800" />
          </div>
        )}
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
