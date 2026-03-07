import type { Character, CharacterGenerationOverrides } from "@shared/character-types";

interface GenerationTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

const PARAMS: {
  key: keyof CharacterGenerationOverrides;
  label: string;
  min: number;
  max: number;
  step: number;
  type: "number" | "text";
}[] = [
  { key: "temperature", label: "Temperature", min: 0, max: 2, step: 0.05, type: "number" },
  { key: "topP", label: "Top P", min: 0, max: 1, step: 0.05, type: "number" },
  { key: "topK", label: "Top K", min: 1, max: 200, step: 1, type: "number" },
  { key: "repetitionPenalty", label: "Repetition Penalty", min: 1, max: 2, step: 0.05, type: "number" },
  { key: "maxNewTokens", label: "Max Tokens", min: 64, max: 4096, step: 64, type: "number" },
  { key: "guidanceScale", label: "CFG Scale", min: 1, max: 3, step: 0.05, type: "number" },
];

export function GenerationTab({ character, onChange }: GenerationTabProps) {
  const overrides = character.generationOverrides || {};

  function updateOverrides(updated: CharacterGenerationOverrides | null) {
    onChange({ generationOverrides: updated });
  }

  function toggleField(key: keyof CharacterGenerationOverrides, defaultValue: unknown) {
    const current = { ...overrides };
    if (key in current) {
      delete current[key];
      // Also remove paired enabled flag if toggling topP/topK off
      if (key === "topP") delete current.topPEnabled;
      if (key === "topK") delete current.topKEnabled;
    } else {
      (current as Record<string, unknown>)[key] = defaultValue;
      if (key === "topP") current.topPEnabled = true;
      if (key === "topK") current.topKEnabled = true;
    }
    updateOverrides(Object.keys(current).length > 0 ? current : null);
  }

  function setField(key: keyof CharacterGenerationOverrides, value: unknown) {
    const current = { ...overrides };
    (current as Record<string, unknown>)[key] = value;
    updateOverrides(current);
  }

  const defaults: Record<string, number> = {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    repetitionPenalty: 1.1,
    maxNewTokens: 512,
    guidanceScale: 1.0,
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Override generation parameters for this character. Disabled fields use the global preset.
      </p>

      {PARAMS.map((param) => {
        const enabled = param.key in overrides;
        const value = enabled
          ? (overrides[param.key] as number)
          : defaults[param.key];

        return (
          <div key={param.key} className="space-y-1.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleField(param.key, defaults[param.key])}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  enabled ? "bg-indigo-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-4" : ""
                  }`}
                />
              </button>
              <label className="text-sm font-medium text-zinc-300">
                {param.label}
              </label>
              {enabled && (
                <span className="ml-auto text-sm tabular-nums text-indigo-400">
                  {value}
                </span>
              )}
              {!enabled && (
                <span className="ml-auto text-xs text-zinc-600">
                  Preset default
                </span>
              )}
            </div>
            {enabled && (
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={value ?? defaults[param.key]}
                onChange={(e) => setField(param.key, parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500"
              />
            )}
          </div>
        );
      })}

      {/* Stop Sequences */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleField("stopSequences", [])}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              "stopSequences" in overrides ? "bg-indigo-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                "stopSequences" in overrides ? "translate-x-4" : ""
              }`}
            />
          </button>
          <label className="text-sm font-medium text-zinc-300">
            Stop Sequences
          </label>
          {"stopSequences" in overrides ? null : (
            <span className="ml-auto text-xs text-zinc-600">
              Preset default
            </span>
          )}
        </div>
        {"stopSequences" in overrides && (
          <input
            type="text"
            value={(overrides.stopSequences || []).join(", ")}
            onChange={(e) => {
              const seqs = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setField("stopSequences", seqs);
            }}
            placeholder="Comma-separated sequences..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        )}
      </div>

      {/* Negative Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleField("negativePrompt", "")}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              "negativePrompt" in overrides ? "bg-indigo-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                "negativePrompt" in overrides ? "translate-x-4" : ""
              }`}
            />
          </button>
          <label className="text-sm font-medium text-zinc-300">
            Negative Prompt
          </label>
          {"negativePrompt" in overrides ? null : (
            <span className="ml-auto text-xs text-zinc-600">
              Preset default
            </span>
          )}
        </div>
        {"negativePrompt" in overrides && (
          <textarea
            value={(overrides.negativePrompt as string) || ""}
            onChange={(e) => setField("negativePrompt", e.target.value)}
            placeholder="Describe what to avoid for this character..."
            rows={3}
            className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
