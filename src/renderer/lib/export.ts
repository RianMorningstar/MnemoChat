import type { ContentBlock, ExportBlock, ExportSegment, ExportOptions } from "@shared/types";

export function exportToMarkdown(
  blocks: ContentBlock[],
  options: ExportOptions
): string {
  const visible = blocks.filter((b) => !b.hidden);
  const parts: string[] = [];

  for (let i = 0; i < visible.length; i++) {
    const block = visible[i];

    if (i > 0) {
      parts.push("\n---\n");
    }

    if (options.characterHeaders && block.speaker) {
      parts.push(`**${block.speaker}**\n\n`);
    }

    // Text is already in *italic* format which maps to markdown italic
    parts.push(block.text.trim());
    parts.push("\n");
  }

  return parts.join("").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function exportToPlainText(
  blocks: ContentBlock[],
  options: ExportOptions
): string {
  const visible = blocks.filter((b) => !b.hidden);
  const parts: string[] = [];

  for (let i = 0; i < visible.length; i++) {
    const block = visible[i];

    if (i > 0) {
      parts.push("\n* * *\n\n");
    }

    if (options.characterHeaders && block.speaker) {
      parts.push(`${block.speaker}\n\n`);
    }

    // Keep literal asterisks for plain text
    parts.push(block.text.trim());
    parts.push("\n");
  }

  return parts.join("").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function exportToJson(
  blocks: ContentBlock[],
  options: ExportOptions
): ExportBlock[] {
  const visible = blocks.filter((b) => !b.hidden);

  return visible.map((block) => {
    const segments: ExportSegment[] = [];
    const text = block.text.trim();

    // Parse text into segments: *action*, "dialogue", narration
    const parts = text.split(/(\*[^*]+\*|"[^"]*")/);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
        segments.push({ type: "action", text: trimmed.slice(1, -1) });
      } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        segments.push({ type: "dialogue", text: trimmed });
      } else {
        segments.push({ type: "narration", text: trimmed });
      }
    }

    const hasAction = segments.some((s) => s.type === "action");
    const hasDialogue = segments.some((s) => s.type === "dialogue");
    let blockType: "action" | "dialogue" | "mixed" = "action";
    if (hasAction && hasDialogue) blockType = "mixed";
    else if (hasDialogue) blockType = "dialogue";

    return {
      bookmarkLabel: block.bookmarkLabel,
      type: blockType,
      speaker: block.speaker,
      segments,
    };
  });
}

export function triggerDownload(
  content: string | Blob,
  filename: string,
  mimeType: string
): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
