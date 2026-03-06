/** Pure utility functions shared across route handlers. */

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function substituteVars(
  text: string,
  charName: string,
  userName: string
): string {
  return text
    .replace(/\{\{char\}\}/gi, charName)
    .replace(/\{\{user\}\}/gi, userName);
}

export function buildSystemMessage(char: {
  systemPrompt: string | null;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  name: string;
}): string {
  const parts: string[] = [];

  if (char.systemPrompt) {
    parts.push(char.systemPrompt);
  }

  const preamble = `Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.`;

  const fields: string[] = [];
  if (char.description) fields.push(`{{char}}'s description: ${char.description}`);
  if (char.personality) fields.push(`{{char}}'s personality: ${char.personality}`);
  if (char.scenario) fields.push(`Scenario: ${char.scenario}`);

  if (fields.length > 0) {
    parts.unshift(preamble + "\n\n" + fields.join("\n\n"));
  } else if (parts.length === 0) {
    return `Write ${char.name}'s next reply in a fictional chat between ${char.name} and {{user}}.`;
  }

  return parts.join("\n\n");
}
