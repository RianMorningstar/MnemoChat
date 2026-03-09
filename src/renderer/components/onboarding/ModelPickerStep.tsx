import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Star, X } from "lucide-react";
import type { OllamaModel, ModelTag, ContentTier } from "@shared/types";

interface ModelPickerStepProps {
  models: OllamaModel[];
  selectedModel: string | null;
  contentTier: ContentTier | null;
  onSelectModel?: (modelName: string) => void;
  onComplete?: () => void;
}

const tagColors: Record<ModelTag, string> = {
  roleplay: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  instruct: "bg-zinc-700/50 text-zinc-400 border-zinc-600/30",
  uncensored: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  vision: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  code: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const allTags: ModelTag[] = [
  "roleplay",
  "instruct",
  "uncensored",
  "vision",
  "code",
];

export function ModelPickerStep({
  models,
  selectedModel,
  contentTier,
  onSelectModel,
  onComplete,
}: ModelPickerStepProps) {
  const { t } = useTranslation('onboarding');
  const [search, setSearch] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<ModelTag | null>(null);

  const sortedAndFiltered = useMemo(() => {
    let result = [...models];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.family.toLowerCase().includes(q)
      );
    }

    if (activeTagFilter) {
      result = result.filter((m) => m.tags.includes(activeTagFilter));
    }

    result.sort((a, b) => {
      if (contentTier === "nsfw") {
        const aUncensored = a.tags.includes("uncensored") ? 1 : 0;
        const bUncensored = b.tags.includes("uncensored") ? 1 : 0;
        if (aUncensored !== bUncensored) return bUncensored - aUncensored;
      }
      return b.parameterCount - a.parameterCount;
    });

    return result;
  }, [models, search, activeTagFilter, contentTier]);

  const formatContextWindow = (ctx: number) => {
    if (ctx >= 1000) return `${Math.round(ctx / 1024)}K ctx`;
    return `${ctx} ctx`;
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center">
      <h2
        className="mb-2 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        {t('model.title')}
      </h2>
      <p className="mb-8 text-zinc-500">
        {t('model.subtitle')}
      </p>

      <div className="mb-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('model.search')}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setActiveTagFilter(activeTagFilter === tag ? null : tag)
              }
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                activeTagFilter === tag
                  ? tagColors[tag]
                  : "border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] w-full overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/30 p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {sortedAndFiltered.map((model) => {
            const isSelected = selectedModel === model.name;

            return (
              <button
                key={model.name}
                onClick={() => onSelectModel?.(model.name)}
                className={`group relative flex flex-col rounded-lg border p-4 text-left transition-all duration-150 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {model.displayName}
                  </h3>
                  {model.isCommunityFavorite && (
                    <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
                      <Star
                        className="h-3 w-3 text-amber-400"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                      <span className="text-[10px] font-medium text-amber-400">
                        {t('model.favorite')}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  className="mb-3 flex items-center gap-3 text-xs text-zinc-500"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span>{model.parameterSize}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-zinc-600" />
                  <span>{formatContextWindow(model.contextWindow)}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-zinc-600" />
                  <span>{model.sizeOnDisk}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {model.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${tagColors[tag]}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {isSelected && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
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
                )}
              </button>
            );
          })}
        </div>

        {sortedAndFiltered.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-zinc-500">
              {t('model.noMatch')}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onComplete}
        disabled={!selectedModel}
        className={`mt-8 rounded-lg px-10 py-3.5 text-sm font-semibold transition-all duration-200 ${
          selectedModel
            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 hover:shadow-indigo-500/30"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        }`}
      >
        {t('model.startChatting')}
      </button>
    </div>
  );
}
