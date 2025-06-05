import type { Character } from "@shared/character-types";

interface PromptEngineeringTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

export function PromptEngineeringTab({
  character,
  onChange,
}: PromptEngineeringTabProps) {
  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          System Prompt
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          Placed at the beginning of the conversation context. Use this for core
          instructions that define character behavior.
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
          Post-History Instructions
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          Injected after the conversation history, right before the model
          generates a response.
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

      {/* Example Dialogues */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Example Dialogues
        </label>
        <p className="mb-2 text-xs text-zinc-500">
          Example message exchanges to guide the model's tone and style. Each
          entry is one dialogue sample.
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
              Remove
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
          + Add dialogue
        </button>
      </div>
    </div>
  );
}
