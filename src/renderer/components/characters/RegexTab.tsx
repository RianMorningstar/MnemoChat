import { useState } from "react";
import { Plus, Trash2, GripVertical, AlertCircle } from "lucide-react";
import type { Character, RegexSubstitution } from "@shared/character-types";

interface RegexTabProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

function validatePattern(pattern: string, flags: string): string | null {
  if (!pattern) return null;
  try {
    new RegExp(pattern, flags);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export function RegexTab({ character, onChange }: RegexTabProps) {
  const rules = character.regexSubstitutions ?? [];
  const [testInput, setTestInput] = useState("");

  function updateRules(updated: RegexSubstitution[]) {
    onChange({ regexSubstitutions: updated.length > 0 ? updated : null });
  }

  function addRule() {
    updateRules([...rules, { pattern: "", replacement: "", flags: "g", enabled: true }]);
  }

  function removeRule(index: number) {
    updateRules(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, updates: Partial<RegexSubstitution>) {
    updateRules(rules.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }

  // Compute test output
  let testOutput = testInput;
  if (testInput) {
    for (const rule of rules) {
      if (!rule.enabled || !rule.pattern) continue;
      try {
        const regex = new RegExp(rule.pattern, rule.flags || "g");
        testOutput = testOutput.replace(regex, rule.replacement);
      } catch {
        // skip invalid
      }
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Define find/replace patterns applied to AI responses before display.
        Original messages are preserved — substitutions are display-only.
      </p>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, idx) => {
          const error = validatePattern(rule.pattern, rule.flags);
          return (
            <div
              key={idx}
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-zinc-600" />
                <button
                  type="button"
                  onClick={() => updateRule(idx, { enabled: !rule.enabled })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    rule.enabled ? "bg-indigo-600" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      rule.enabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-zinc-400">
                  Rule {idx + 1}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => removeRule(idx)}
                  className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                  title="Remove rule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Pattern (regex)
                  </label>
                  <input
                    type="text"
                    value={rule.pattern}
                    onChange={(e) => updateRule(idx, { pattern: e.target.value })}
                    placeholder="e\.g\. \\*\\*(.*?)\\*\\*"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Flags
                  </label>
                  <input
                    type="text"
                    value={rule.flags}
                    onChange={(e) => updateRule(idx, { flags: e.target.value })}
                    placeholder="g"
                    className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Replacement
                </label>
                <input
                  type="text"
                  value={rule.replacement}
                  onChange={(e) => updateRule(idx, { replacement: e.target.value })}
                  placeholder="e.g. $1 or replacement text"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addRule}
        className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Rule
      </button>

      {/* Test area */}
      {rules.length > 0 && (
        <div className="space-y-2 border-t border-zinc-800 pt-4">
          <label className="text-xs font-medium text-zinc-400">
            Test substitutions
          </label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={3}
            placeholder="Paste sample AI output here to preview substitutions..."
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
          {testInput && testOutput !== testInput && (
            <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-indigo-400">
                Result
              </p>
              <p className="whitespace-pre-wrap text-sm text-zinc-300">
                {testOutput}
              </p>
            </div>
          )}
          {testInput && testOutput === testInput && (
            <p className="text-xs text-zinc-500 italic">
              No changes — patterns did not match the test input.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
