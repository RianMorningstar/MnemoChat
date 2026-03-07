import type { RegexSubstitution } from "@shared/character-types";

/**
 * Apply a character's regex substitution rules to message content.
 * Used at display time — raw content is preserved in the database.
 */
export function applySubstitutions(
  content: string,
  substitutions: RegexSubstitution[] | null | undefined
): string {
  if (!substitutions || substitutions.length === 0) return content;

  return substitutions.reduce((text, rule) => {
    if (!rule.enabled || !rule.pattern) return text;
    try {
      const regex = new RegExp(rule.pattern, rule.flags || "g");
      return text.replace(regex, rule.replacement);
    } catch {
      return text;
    }
  }, content);
}
