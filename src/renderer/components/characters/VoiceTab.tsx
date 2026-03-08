import { useState, useEffect, useCallback } from "react";
import { Volume2, Play, Loader2 } from "lucide-react";
import type { Character } from "@shared/character-types";
import type { TtsProviderType, TtsVoice, TtsSettings } from "@shared/tts-types";
import { OPENAI_TTS_VOICES, OPENAI_TTS_MODELS } from "@shared/tts-types";
import { listTtsVoices, clearTtsCache } from "@/lib/api";
import { useTtsPlayback } from "@/lib/tts-playback";
import { cn } from "@/lib/utils";

interface VoiceTabProps {
  character: Character & Partial<Character>;
  onChange: (updates: Partial<Character>) => void;
}

const PROVIDER_OPTIONS: { id: TtsProviderType | ""; label: string }[] = [
  { id: "", label: "Use global default" },
  { id: "system", label: "System (free)" },
  { id: "openai", label: "OpenAI" },
  { id: "elevenlabs", label: "ElevenLabs" },
];

export function VoiceTab({ character, onChange }: VoiceTabProps) {
  const provider = (character.ttsProvider as TtsProviderType) || "";
  const voice = character.ttsVoice || "";
  const settings: TtsSettings = character.ttsSettings || {};

  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const tts = useTtsPlayback();

  // Fetch voices when provider changes
  useEffect(() => {
    if (!provider || provider === "system") {
      setVoices([]);
      return;
    }
    setLoadingVoices(true);
    setVoiceError(null);
    listTtsVoices(provider)
      .then(setVoices)
      .catch((err) => setVoiceError(err.message))
      .finally(() => setLoadingVoices(false));
  }, [provider]);

  const handleProviderChange = useCallback(
    (newProvider: string) => {
      onChange({
        ttsProvider: newProvider || null,
        ttsVoice: null,
        ttsSettings: null,
      });
    },
    [onChange],
  );

  const handleVoiceChange = useCallback(
    (newVoice: string) => {
      onChange({ ttsVoice: newVoice || null });
    },
    [onChange],
  );

  const handleSettingsChange = useCallback(
    (updates: Partial<TtsSettings>) => {
      onChange({ ttsSettings: { ...settings, ...updates } });
    },
    [onChange, settings],
  );

  const handlePreview = useCallback(() => {
    if (!voice) return;
    tts.playMessage(
      `preview-${character.id}`,
      character.firstMessage || `Hello, I am ${character.name}.`,
      character.id,
      "neutral",
      provider as TtsProviderType,
      voice,
      settings,
    );
  }, [character.id, character.name, character.firstMessage, provider, voice, settings, tts]);

  const handleClearCache = useCallback(async () => {
    await clearTtsCache(character.id);
  }, [character.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Volume2 className="h-5 w-5 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Voice Settings</h3>
      </div>

      {/* Provider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">TTS Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Voice selection */}
      {provider && provider !== "system" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">Voice</label>
          {loadingVoices ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading voices...
            </div>
          ) : voiceError ? (
            <p className="text-xs text-red-400">{voiceError}</p>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={voice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
              >
                <option value="">Select a voice</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePreview}
                disabled={!voice || tts.loadingMessageId != null}
                className={cn(
                  "rounded-lg border border-zinc-700 p-2 transition-colors",
                  voice
                    ? "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    : "cursor-not-allowed text-zinc-600",
                )}
                title="Preview voice"
              >
                {tts.loadingMessageId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* System voice note */}
      {provider === "system" && (
        <p className="text-xs text-zinc-500">
          System TTS uses your operating system's built-in voices. Voice selection happens automatically based on your system settings.
        </p>
      )}

      {/* OpenAI-specific settings */}
      {provider === "openai" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Model</label>
            <select
              value={settings.model || "tts-1"}
              onChange={(e) => handleSettingsChange({ model: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
            >
              {OPENAI_TTS_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                  {m === "gpt-4o-mini-tts" ? " (emotion-aware)" : ""}
                </option>
              ))}
            </select>
            {(settings.model || "tts-1") === "gpt-4o-mini-tts" && (
              <p className="text-[10px] text-indigo-400/70">
                This model supports emotion-aware speech based on the classified expression.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Speed: {(settings.speed || 1.0).toFixed(1)}x
            </label>
            <input
              type="range"
              min={0.25}
              max={4.0}
              step={0.25}
              value={settings.speed || 1.0}
              onChange={(e) => handleSettingsChange({ speed: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      )}

      {/* ElevenLabs-specific settings */}
      {provider === "elevenlabs" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Stability: {(settings.stability ?? 0.5).toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.stability ?? 0.5}
              onChange={(e) => handleSettingsChange({ stability: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <p className="text-[10px] text-zinc-600">Lower = more expressive, higher = more consistent</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Similarity Boost: {(settings.similarityBoost ?? 0.75).toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.similarityBoost ?? 0.75}
              onChange={(e) => handleSettingsChange({ similarityBoost: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Style: {(settings.style ?? 0.0).toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.style ?? 0.0}
              onChange={(e) => handleSettingsChange({ style: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
            <p className="text-[10px] text-zinc-600">Higher = more dramatic. Note: when emotion modulation is enabled, these values are overridden per-message.</p>
          </div>
        </div>
      )}

      {/* Cache management */}
      <div className="border-t border-zinc-800 pt-4">
        <button
          onClick={handleClearCache}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          Clear cached audio
        </button>
        <p className="mt-1 text-[10px] text-zinc-600">
          Remove all generated TTS audio files for this character.
        </p>
      </div>
    </div>
  );
}
