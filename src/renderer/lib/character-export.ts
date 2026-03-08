import type { Character } from "@shared/character-types";
import { triggerDownload } from "./export";

interface CharaCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: Record<string, unknown>;
}

/** @internal exported for testing */
export function buildCharaCardV2(character: Character): CharaCardV2 {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: character.name,
      description: character.description || "",
      personality: character.personality || "",
      scenario: character.scenario || "",
      first_mes: character.firstMessage || "",
      mes_example:
        character.exampleDialogues.length > 0
          ? character.exampleDialogues.map((d) => `<START>\n${d}`).join("\n")
          : "",
      alternate_greetings: character.alternateGreetings,
      system_prompt: character.systemPrompt || "",
      post_history_instructions: character.postHistoryInstructions || "",
      creator_notes: character.creatorNotes || "",
      tags: character.tags,
      creator: character.creatorName || "",
      character_version: character.characterVersion || "",
      extensions: {
        mnemochat: {
          contentTier: character.contentTier,
          generationOverrides: character.generationOverrides ?? null,
          authorNote: character.authorNote ?? null,
          authorNoteDepth: character.authorNoteDepth,
          quickReplies: character.quickReplies ?? null,
          regexSubstitutions: character.regexSubstitutions ?? null,
          defaultExpression: character.defaultExpression,
          ttsProvider: character.ttsProvider ?? null,
          ttsVoice: character.ttsVoice ?? null,
          ttsSettings: character.ttsSettings ?? null,
          imageGenPromptPrefix: character.imageGenPromptPrefix ?? null,
          imageGenSettings: character.imageGenSettings ?? null,
        },
      },
    },
  };
}

/** @internal exported for testing */
export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "character";
}

/**
 * Export character as Character Card V2 JSON file.
 */
export function exportCharacterAsJson(character: Character): void {
  const card = buildCharaCardV2(character);
  const json = JSON.stringify(card, null, 2);
  triggerDownload(json, `${sanitizeName(character.name)}.json`, "application/json");
}

// ── PNG export with embedded tEXt metadata ─────────────────────────────

/** CRC-32 lookup table (standard polynomial 0xEDB88320) */
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

/** @internal exported for testing */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** @internal exported for testing */
export function buildCharaTEXtChunk(jsonStr: string): Uint8Array {
  // Encode JSON as UTF-8, then base64
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binaryStr = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binaryStr += String.fromCharCode(utf8Bytes[i]);
  }
  const b64 = btoa(binaryStr);

  const keyword = "chara";
  const dataLen = keyword.length + 1 + b64.length; // keyword + null + base64

  // Build chunk: [4B length][4B type][data][4B CRC]
  const chunk = new Uint8Array(4 + 4 + dataLen + 4);
  const view = new DataView(chunk.buffer);

  // Length (big-endian)
  view.setUint32(0, dataLen);

  // Chunk type "tEXt"
  chunk[4] = 0x74; // t
  chunk[5] = 0x45; // E
  chunk[6] = 0x58; // X
  chunk[7] = 0x74; // t

  // Data: keyword + null + base64 text
  let offset = 8;
  for (let i = 0; i < keyword.length; i++) {
    chunk[offset++] = keyword.charCodeAt(i);
  }
  chunk[offset++] = 0; // null separator
  for (let i = 0; i < b64.length; i++) {
    chunk[offset++] = b64.charCodeAt(i);
  }

  // CRC over type + data
  const crcData = chunk.slice(4, 8 + dataLen);
  view.setUint32(8 + dataLen, crc32(crcData));

  return chunk;
}

/** Decode a base64 data URL to an ArrayBuffer. */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.split(",")[1];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Create a placeholder PNG for characters without portraits. */
function createPlaceholderPng(name: string): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, "#3730a3");
  grad.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#e0e7ff";
  ctx.font = "bold 96px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.charAt(0).toUpperCase(), 128, 128);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        blob.arrayBuffer().then(resolve, reject);
      },
      "image/png",
    );
  });
}

/**
 * Export character as a PNG file with Character Card V2 metadata
 * embedded in a tEXt chunk (SillyTavern-compatible).
 */
export async function exportCharacterAsPng(character: Character): Promise<void> {
  const card = buildCharaCardV2(character);
  const jsonStr = JSON.stringify(card);
  const textChunk = buildCharaTEXtChunk(jsonStr);

  // Get PNG bytes from portrait (or generate placeholder)
  let pngBuffer: ArrayBuffer;
  const portrait = character.portraitUrl?.trim() || "";
  if (portrait.startsWith("data:image/png")) {
    // PNG data URL — decode base64 directly (avoids tainted canvas)
    pngBuffer = dataUrlToArrayBuffer(portrait);
  } else if (portrait.startsWith("data:")) {
    // Non-PNG data URL (jpeg/webp) — convert to PNG via OffscreenCanvas
    const resp = await fetch(portrait);
    const srcBlob = await resp.blob();
    const bitmap = await createImageBitmap(srcBlob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const pngBlob = await canvas.convertToBlob({ type: "image/png" });
    pngBuffer = await pngBlob.arrayBuffer();
  } else if (portrait.startsWith("http://") || portrait.startsWith("https://") || portrait.startsWith("/")) {
    // Remote or local URL — fetch, convert to PNG
    const resp = await fetch(portrait);
    const srcBlob = await resp.blob();
    if (srcBlob.type === "image/png") {
      pngBuffer = await srcBlob.arrayBuffer();
    } else {
      const bitmap = await createImageBitmap(srcBlob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      const pngBlob = await canvas.convertToBlob({ type: "image/png" });
      pngBuffer = await pngBlob.arrayBuffer();
    }
  } else {
    pngBuffer = await createPlaceholderPng(character.name);
  }

  const pngBytes = new Uint8Array(pngBuffer);

  // Insert tEXt chunk before IEND (last 12 bytes of PNG)
  const iendStart = pngBytes.length - 12;
  const result = new Uint8Array(pngBytes.length + textChunk.length);
  result.set(pngBytes.subarray(0, iendStart), 0);
  result.set(textChunk, iendStart);
  result.set(pngBytes.subarray(iendStart), iendStart + textChunk.length);

  const blob = new Blob([result], { type: "image/png" });
  triggerDownload(blob, `${sanitizeName(character.name)}.png`, "image/png");
}
