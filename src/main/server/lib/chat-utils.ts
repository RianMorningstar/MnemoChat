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

export interface MacroContext {
  charName: string;
  userName: string;
  personaDescription?: string;
  modelName?: string;
  charDescription?: string;
  charPersonality?: string;
  charScenario?: string;
  currentInput?: string;
  messages?: Array<{ role: string; content: string; timestamp?: string }>;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function substituteVars(
  text: string,
  ctx: MacroContext
): string {
  const now = new Date();

  // Find last messages by role for message-derived macros
  const msgs = ctx.messages || [];
  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
  const lastUserMsg = [...msgs].reverse().find((m) => m.role === "user");
  const lastCharMsg = [...msgs].reverse().find((m) => m.role === "assistant");

  // Compute idle duration
  let idleDuration = "";
  if (lastUserMsg?.timestamp) {
    const elapsed = now.getTime() - new Date(lastUserMsg.timestamp).getTime();
    idleDuration = elapsed > 0 ? formatDuration(elapsed) : "just now";
  }

  return text
    .replace(/\{\{char\}\}/gi, ctx.charName)
    .replace(/\{\{user\}\}/gi, ctx.userName)
    .replace(/\{\{persona\}\}/gi, ctx.personaDescription || "")
    .replace(/\{\{date\}\}/gi, now.toLocaleDateString())
    .replace(/\{\{time\}\}/gi, now.toLocaleTimeString())
    .replace(/\{\{isodate\}\}/gi, now.toISOString().slice(0, 10))
    .replace(/\{\{isotime\}\}/gi, now.toTimeString().slice(0, 5))
    .replace(/\{\{idle_duration\}\}/gi, idleDuration)
    .replace(/\{\{lastMessage\}\}/gi, lastMsg?.content || "")
    .replace(/\{\{lastUserMessage\}\}/gi, lastUserMsg?.content || "")
    .replace(/\{\{lastCharMessage\}\}/gi, lastCharMsg?.content || "")
    .replace(/\{\{input\}\}/gi, ctx.currentInput || "")
    .replace(/\{\{model\}\}/gi, ctx.modelName || "")
    .replace(/\{\{description\}\}/gi, ctx.charDescription || "")
    .replace(/\{\{personality\}\}/gi, ctx.charPersonality || "")
    .replace(/\{\{scenario\}\}/gi, ctx.charScenario || "")
    .replace(/\{\{random::([^}]+)\}\}/gi, (_match, options: string) => {
      const choices = options.split(",").map((s) => s.trim());
      return choices[Math.floor(Math.random() * choices.length)] || "";
    });
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
