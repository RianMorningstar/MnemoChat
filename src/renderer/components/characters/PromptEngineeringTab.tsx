import type { Character } from "@shared/character-types";
import { useTranslation } from "react-i18next";

interface PromptEngineeringTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

export function PromptEngineeringTab({
  character,
  onChange,
}: PromptEngineeringTabProps) {
  const { t } = useTranslation('characters');
  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('prompts.systemPrompt')}
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          {t('prompts.systemPromptDesc')}
        </p>
        <textarea
          value={character.systemPrompt || ""}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          rows={6}
          placeholder="You are {{char}}. You always stay in character..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Post-History Instructions */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('prompts.postHistory')}
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          {t('prompts.postHistoryDesc')}
        </p>
        <textarea
          value={character.postHistoryInstructions || ""}
          onChange={(e) =>
            onChange({ postHistoryInstructions: e.target.value })
          }
          rows={4}
          placeholder="[Write your next reply as {{char}}. Be descriptive and creative.]"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Author's Note */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('prompts.authorsNote')}
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          {t('prompts.authorsNoteDesc')}
        </p>
        <textarea
          value={character.authorNote || ""}
          onChange={(e) => onChange({ authorNote: e.target.value })}
          rows={4}
          placeholder="[Write in a dark fantasy style with vivid descriptions...]"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-3">
          <label className="text-xs text-zinc-400">{t('prompts.injectionDepth')}</label>
          <input
            type="number"
            min={1}
            max={20}
            value={character.authorNoteDepth ?? 4}
            onChange={(e) =>
              onChange({
                authorNoteDepth: Math.max(1, Math.min(20, Number(e.target.value) || 4)),
              })
            }
            className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-xs text-zinc-500">
            {t('prompts.injectionDepthHint')}
          </span>
        </div>
      </div>

      {/* Example Dialogues */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          {t('prompts.exampleDialogues')}
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          {t('prompts.exampleDialoguesDesc')}
        </p>
        {character.exampleDialogues.map((dialogue, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <textarea
              value={dialogue}
              onChange={(e) => {
                const updated = [...character.exampleDialogues];
                updated[i] = e.target.value;
                onChange({ exampleDialogues: updated });
              }}
              rows={3}
              placeholder={`{{user}}: Hello!\n{{char}}: *waves* Hi there!`}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => {
                const updated = character.exampleDialogues.filter(
                  (_, j) => j !== i
                );
                onChange({ exampleDialogues: updated });
              }}
              className="self-start rounded px-2 py-2 text-sm text-red-400 hover:bg-red-900/20"
            >
              {t('basic.remove')}
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            onChange({
              exampleDialogues: [...character.exampleDialogues, ""],
            })
          }
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          {t('prompts.addDialogue')}
        </button>
      </div>
    </div>
  );
}
