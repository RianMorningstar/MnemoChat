/**
 * Extract character card JSON from a PNG file's tEXt chunks.
 * Supports Character Card V1, V2, and V3 specs.
 * The card data is stored as base64-encoded JSON in a tEXt chunk with keyword "chara".
 */

interface CharaCardData {
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  alternate_greetings?: string[];
  system_prompt?: string;
  post_history_instructions?: string;
  creator_notes?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
}

export interface ParsedCharacterCard {
  name: string;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  firstMessage: string | null;
  alternateGreetings: string[];
  systemPrompt: string | null;
  postHistoryInstructions: string | null;
  exampleDialogues: string[];
  creatorNotes: string | null;
  tags: string[];
  creatorName: string | null;
  characterVersion: string | null;
  specVersion: string;
}

export async function extractCharacterFromPng(file: File): Promise<ParsedCharacterCard | null> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  // Verify PNG signature
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < signature.length; i++) {
    if (view.getUint8(i) !== signature[i]) return null;
  }

  let pos = 8;
  while (pos < buffer.byteLength) {
    const length = view.getUint32(pos);
    const typeBytes = new Uint8Array(buffer, pos + 4, 4);
    const chunkType = String.fromCharCode(...typeBytes);

    if (chunkType === "tEXt") {
      const chunkData = new Uint8Array(buffer, pos + 8, length);

      // Find null separator between keyword and text
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = new TextDecoder("latin1").decode(chunkData.slice(0, nullIdx));

        if (keyword === "chara") {
          // Build base64 string from raw bytes (safe for large payloads)
          const b64Bytes = chunkData.slice(nullIdx + 1);
          let b64Str = "";
          for (let i = 0; i < b64Bytes.length; i++) {
            b64Str += String.fromCharCode(b64Bytes[i]);
          }
          try {
            // Decode base64 to binary, then interpret as UTF-8
            const binaryStr = atob(b64Str);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const jsonStr = new TextDecoder("utf-8").decode(bytes);
            const json = JSON.parse(jsonStr);
            return parseCharaJson(json);
          } catch (e) {
            console.error("Failed to decode chara tEXt chunk:", e);
            return null;
          }
        }
      }
    }

    if (chunkType === "IEND") break;
    pos += 12 + length; // 4 (length) + 4 (type) + data + 4 (CRC)
  }

  return null;
}

export function parseCharacterJson(json: unknown): ParsedCharacterCard {
  return parseCharaJson(json as Record<string, unknown>);
}

function parseCharaJson(json: Record<string, unknown>): ParsedCharacterCard {
  // V2/V3 have a "data" wrapper, V1 is flat
  const data = (json.data as CharaCardData) || (json as unknown as CharaCardData);
  const spec = (json.spec as string) || "";
  // Map v3 to v2 since the app schema only knows v1/v2
  const specVersion = spec.includes("v3") ? "v2" : spec.includes("v2") ? "v2" : "v1";

  // mes_example can be a single string with <START> delimiters
  const exampleDialogues: string[] = [];
  if (data.mes_example) {
    const parts = data.mes_example
      .split(/<START>/gi)
      .map((s) => s.trim())
      .filter(Boolean);
    exampleDialogues.push(...parts);
  }

  return {
    name: data.name || "Unknown",
    description: data.description || null,
    personality: data.personality || null,
    scenario: data.scenario || null,
    firstMessage: data.first_mes || null,
    alternateGreetings: data.alternate_greetings || [],
    systemPrompt: data.system_prompt || null,
    postHistoryInstructions: data.post_history_instructions || null,
    exampleDialogues,
    creatorNotes: data.creator_notes || null,
    tags: data.tags || [],
    creatorName: data.creator || null,
    characterVersion: data.character_version || null,
    specVersion,
  };
}
