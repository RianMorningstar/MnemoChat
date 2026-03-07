/** Pure utility functions shared across route handlers. */

export interface LoreEntryForMatching {
  id: string;
  characterId: string;
  lorebookId: string | null;
  enabled: boolean;
  keywords: string[];
  logic: string;
  probability: number;
  scanDepth: number;
  content: string | null;
  insertionPosition: string;
  priority: number;
}

/**
 * Filter and sort lorebook entries that should be injected for the current
 * chat context. Applies trigger logic, scan depth, and probability roll.
 *
 * @param entries  All candidate entries (already deserialized: keywords as string[], enabled as boolean)
 * @param messages Chat history messages to scan for keyword matches
 * @returns        Matching entries sorted by priority descending
 */
export function matchLorebookEntries(
  entries: LoreEntryForMatching[],
  messages: { role: string; content: string }[]
): LoreEntryForMatching[] {
  const triggered: LoreEntryForMatching[] = [];

  for (const entry of entries) {
    if (!entry.enabled) continue;
    if (!entry.content) continue;

    const keywords = entry.keywords
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (keywords.length === 0) continue;

    // Determine the scan window
    const scanWindow =
      entry.scanDepth === 0
        ? messages
        : messages.slice(-entry.scanDepth);

    const scannedTexts = scanWindow.map((m) => m.content.toLowerCase());

    const keywordFound = (kw: string) =>
      scannedTexts.some((text) => text.includes(kw));

    let matches = false;
    switch (entry.logic) {
      case "AND_ANY":
        matches = keywords.some((kw) => keywordFound(kw));
        break;
      case "AND_ALL":
        matches = keywords.every((kw) => keywordFound(kw));
        break;
      case "NOT_ANY":
        matches = !keywords.some((kw) => keywordFound(kw));
        break;
      case "NOT_ALL":
        matches = !keywords.every((kw) => keywordFound(kw));
        break;
      default:
        matches = keywords.some((kw) => keywordFound(kw));
    }

    if (!matches) continue;

    // Probability check: 100 = always trigger, 0 = never trigger
    if (Math.random() * 100 >= entry.probability) continue;

    triggered.push(entry);
  }

  // Higher priority first
  return triggered.sort((a, b) => b.priority - a.priority);
}

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
