import { useState } from "react";
import type { ContentTierOption, ContentTier } from "@shared/types";
import { Shield, Flame } from "lucide-react";

interface ContentTierStepProps {
  options: ContentTierOption[];
  selectedTier: ContentTier | null;
  onSelectTier?: (tier: ContentTier) => void;
  onConfirmAge?: () => void;
  onNext?: () => void;
}

export function ContentTierStep({
  options,
  selectedTier,
  onSelectTier,
  onConfirmAge,
  onNext,
}: ContentTierStepProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const selectedOption = options.find((o) => o.id === selectedTier);

  const canProceed =
    selectedTier &&
    (!selectedOption?.requiresAgeConfirmation || ageConfirmed);

  const icons: Record<string, typeof Shield> = {
    sfw: Shield,
    nsfw: Flame,
  };

  return (
    <div className="flex flex-col items-center">
      <h1
        className="mb-2 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        MnemoChat
      </h1>
      <p className="mb-12 text-zinc-500">
        Your characters. Your stories. Your rules.
      </p>

      <p className="mb-8 text-lg font-medium text-zinc-300">
        How do you want to use MnemoChat?
      </p>

      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = icons[option.id] || Shield;
          const isSelected = selectedTier === option.id;

          return (
            <button
              key={option.id}
              onClick={() => {
                onSelectTier?.(option.id);
                if (!option.requiresAgeConfirmation) {
                  setAgeConfirmed(false);
                }
              }}
              className={`group relative flex flex-col items-center rounded-xl border-2 px-6 py-8 text-center transition-all duration-200 ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                  : "border-zinc-700/50 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50"
              }`}
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                  isSelected
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-300"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-base font-semibold text-zinc-100">
                {option.label}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {selectedTier === "nsfw" && !ageConfirmed && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-5 py-3">
          <button
            onClick={() => {
              setAgeConfirmed(true);
              onConfirmAge?.();
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-zinc-600 transition-colors hover:border-indigo-500"
          />
          <span className="text-sm text-zinc-400">
            I am 18 years of age or older.
          </span>
        </div>
      )}

      {selectedTier === "nsfw" && ageConfirmed && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-5 py-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-indigo-500 bg-indigo-500">
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="text-sm text-zinc-300">
            I am 18 years of age or older.
          </span>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`mt-10 rounded-lg px-8 py-3 text-sm font-medium transition-all duration-200 ${
          canProceed
            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        }`}
      >
        Continue
      </button>
    </div>
  );
}
