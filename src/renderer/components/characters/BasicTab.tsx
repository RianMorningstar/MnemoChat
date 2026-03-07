import { useRef } from "react";
import { User, Camera, X } from "lucide-react";
import type { Character } from "@shared/character-types";

interface BasicTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

export function BasicTab({ character, onChange }: BasicTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ portraitUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Portrait + Name row */}
      <div className="flex gap-6">
        <div className="group/portrait relative h-40 w-32 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group h-full w-full overflow-hidden rounded-lg bg-zinc-800"
          >
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-12 w-12 text-zinc-600" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-zinc-200" />
              <span className="mt-1 text-xs text-zinc-300">Change</span>
            </div>
          </button>
          {character.portraitUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ portraitUrl: null });
              }}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-zinc-700 p-0.5 text-zinc-400 opacity-0 transition-opacity hover:bg-red-600 hover:text-white group-hover/portrait:opacity-100"
              title="Remove portrait"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Name
            </label>
            <input
              type="text"
              value={character.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Tags
            </label>
            <input
              type="text"
              value={character.tags.join(", ")}
              onChange={(e) =>
                onChange({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Comma-separated tags"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Description
        </label>
        <textarea
          value={character.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder="A detailed description of the character..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Personality */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Personality
        </label>
        <textarea
          value={character.personality || ""}
          onChange={(e) => onChange({ personality: e.target.value })}
          rows={3}
          placeholder="Character's personality traits..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Scenario */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Scenario
        </label>
        <textarea
          value={character.scenario || ""}
          onChange={(e) => onChange({ scenario: e.target.value })}
          rows={3}
          placeholder="The scenario or setting for this character..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* First Message */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          First Message
        </label>
        <textarea
          value={character.firstMessage || ""}
          onChange={(e) => onChange({ firstMessage: e.target.value })}
          rows={4}
          placeholder="The character's opening message..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Alternate Greetings */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">
          Alternate Greetings
        </label>
        {character.alternateGreetings.map((greeting, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <textarea
              value={greeting}
              onChange={(e) => {
                const updated = [...character.alternateGreetings];
                updated[i] = e.target.value;
                onChange({ alternateGreetings: updated });
              }}
              rows={2}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => {
                const updated = character.alternateGreetings.filter((_, j) => j !== i);
                onChange({ alternateGreetings: updated });
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
              alternateGreetings: [...character.alternateGreetings, ""],
            })
          }
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          + Add greeting
        </button>
      </div>
    </div>
  );
}
