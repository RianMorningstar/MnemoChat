import type { Character } from "@shared/character-types";
import type { ContentTier } from "@shared/types";
import { useTranslation } from "react-i18next";

interface MetaTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

export function MetaTab({ character, onChange }: MetaTabProps) {
  const { t } = useTranslation('characters');
  return (
    <div className="space-y-6">
      {/* Creator Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            {t('meta.creatorName')}
          </label>
          <input
            type="text"
            value={character.creatorName || ""}
            onChange={(e) => onChange({ creatorName: e.target.value })}
            placeholder={t('meta.creatorNamePlaceholder')}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            {t('meta.characterVersion')}
          </label>
          <input
            type="text"
            value={character.characterVersion || ""}
            onChange={(e) => onChange({ characterVersion: e.target.value })}
            placeholder="1.0"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Content Tier */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('meta.contentTier')}
        </label>
        <div className="flex gap-3">
          {(["sfw", "nsfw"] as ContentTier[]).map((tier) => (
            <button
              key={tier}
              onClick={() => onChange({ contentTier: tier })}
              className={`rounded-md border px-4 py-2 text-sm ${
                character.contentTier === tier
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tier.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Source URL */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('meta.sourceUrl')}
        </label>
        <input
          type="text"
          value={character.sourceUrl || ""}
          onChange={(e) => onChange({ sourceUrl: e.target.value })}
          placeholder="https://..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Creator Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('meta.creatorNotes')}
        </label>
        <textarea
          value={character.creatorNotes || ""}
          onChange={(e) => onChange({ creatorNotes: e.target.value })}
          rows={3}
          placeholder={t('meta.creatorNotesPlaceholder')}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Internal Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('meta.internalNotes')}
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          {t('meta.internalNotesDesc')}
        </p>
        <textarea
          value={character.internalNotes || ""}
          onChange={(e) => onChange({ internalNotes: e.target.value })}
          rows={3}
          placeholder={t('meta.internalNotesPlaceholder')}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Read-only info */}
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">{t('meta.info')}</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-zinc-500">{t('meta.specVersion')}</span>
          <span className="text-zinc-300">{character.specVersion}</span>
          <span className="text-zinc-500">{t('meta.created')}</span>
          <span className="text-zinc-300">
            {new Date(character.createdAt).toLocaleDateString()}
          </span>
          {character.importDate && (
            <>
              <span className="text-zinc-500">{t('meta.imported')}</span>
              <span className="text-zinc-300">
                {new Date(character.importDate).toLocaleDateString()}
              </span>
            </>
          )}
          <span className="text-zinc-500">{t('meta.tokenCount')}</span>
          <span className="text-zinc-300">
            {character.tokenCount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
