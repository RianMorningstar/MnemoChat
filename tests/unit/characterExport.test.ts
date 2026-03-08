import { describe, it, expect } from "vitest";
import {
  buildCharaCardV2,
  sanitizeName,
  crc32,
  buildCharaTEXtChunk,
} from "../../src/renderer/lib/character-export";
import type { Character } from "../../src/shared/character-types";

/** Minimal character fixture */
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "test-id",
    name: "Test Character",
    portraitUrl: null,
    description: "A brave warrior",
    personality: "Bold and loyal",
    scenario: "Medieval fantasy",
    firstMessage: "Hello, traveler!",
    alternateGreetings: ["Greetings!", "Well met!"],
    systemPrompt: "You are a warrior.",
    postHistoryInstructions: "Stay in character.",
    exampleDialogues: ["{{user}}: Hi\n{{char}}: Hello!", "{{user}}: Bye\n{{char}}: Farewell!"],
    creatorNotes: "Test notes",
    tags: ["fantasy", "warrior"],
    contentTier: "sfw",
    creatorName: "TestCreator",
    characterVersion: "1.0",
    sourceUrl: null,
    specVersion: "v2",
    importDate: null,
    createdAt: "2024-01-01T00:00:00Z",
    lastChatted: null,
    tokenCount: 100,
    internalNotes: null,
    ...overrides,
  };
}

describe("buildCharaCardV2", () => {
  it("produces valid V2 structure with correct spec fields", () => {
    const char = makeCharacter();
    const card = buildCharaCardV2(char);

    expect(card.spec).toBe("chara_card_v2");
    expect(card.spec_version).toBe("2.0");
    expect(card.data.name).toBe("Test Character");
  });

  it("maps fields to V2 naming conventions", () => {
    const char = makeCharacter();
    const card = buildCharaCardV2(char);

    expect(card.data.first_mes).toBe("Hello, traveler!");
    expect(card.data.system_prompt).toBe("You are a warrior.");
    expect(card.data.post_history_instructions).toBe("Stay in character.");
    expect(card.data.creator_notes).toBe("Test notes");
    expect(card.data.creator).toBe("TestCreator");
    expect(card.data.character_version).toBe("1.0");
    expect(card.data.alternate_greetings).toEqual(["Greetings!", "Well met!"]);
    expect(card.data.tags).toEqual(["fantasy", "warrior"]);
  });

  it("joins example dialogues with <START> delimiter", () => {
    const char = makeCharacter();
    const card = buildCharaCardV2(char);

    const mesExample = card.data.mes_example as string;
    expect(mesExample).toContain("<START>");
    expect(mesExample).toContain("{{user}}: Hi");
    expect(mesExample).toContain("{{user}}: Bye");
    // Should have two <START> markers (one per dialogue)
    expect(mesExample.match(/<START>/g)?.length).toBe(2);
  });

  it("produces empty mes_example when no dialogues", () => {
    const char = makeCharacter({ exampleDialogues: [] });
    const card = buildCharaCardV2(char);
    expect(card.data.mes_example).toBe("");
  });

  it("defaults null fields to empty strings", () => {
    const char = makeCharacter({
      description: null,
      personality: null,
      scenario: null,
      firstMessage: null,
      systemPrompt: null,
      postHistoryInstructions: null,
      creatorNotes: null,
      creatorName: null,
      characterVersion: null,
    });
    const card = buildCharaCardV2(char);

    expect(card.data.description).toBe("");
    expect(card.data.personality).toBe("");
    expect(card.data.scenario).toBe("");
    expect(card.data.first_mes).toBe("");
    expect(card.data.system_prompt).toBe("");
    expect(card.data.post_history_instructions).toBe("");
    expect(card.data.creator_notes).toBe("");
    expect(card.data.creator).toBe("");
    expect(card.data.character_version).toBe("");
  });

  it("includes MnemoChat extensions", () => {
    const char = makeCharacter({ contentTier: "nsfw", authorNote: "Keep it dark" });
    const card = buildCharaCardV2(char);

    const ext = (card.data.extensions as Record<string, Record<string, unknown>>).mnemochat;
    expect(ext.contentTier).toBe("nsfw");
    expect(ext.authorNote).toBe("Keep it dark");
  });
});

describe("sanitizeName", () => {
  it("keeps alphanumeric, spaces, hyphens, underscores", () => {
    expect(sanitizeName("My Character-1_test")).toBe("My Character-1_test");
  });

  it("strips special characters", () => {
    expect(sanitizeName("Char@#$%!")).toBe("Char");
  });

  it("handles unicode characters", () => {
    expect(sanitizeName("キャラクター")).toBe("character");
  });

  it("returns 'character' for empty result", () => {
    expect(sanitizeName("")).toBe("character");
    expect(sanitizeName("!!!")).toBe("character");
  });

  it("trims whitespace", () => {
    expect(sanitizeName("  My Char  ")).toBe("My Char");
  });
});

describe("crc32", () => {
  it("computes correct CRC-32 for known input", () => {
    // CRC-32 of "IEND" (the PNG IEND chunk type) = 0xAE426082
    const data = new Uint8Array([0x49, 0x45, 0x4e, 0x44]);
    expect(crc32(data)).toBe(0xae426082);
  });

  it("returns 0 for empty input", () => {
    expect(crc32(new Uint8Array([]))).toBe(0);
  });

  it("computes correct CRC-32 for ASCII text", () => {
    // CRC-32 of "123456789" = 0xCBF43926
    const data = new TextEncoder().encode("123456789");
    expect(crc32(data)).toBe(0xcbf43926);
  });
});

describe("buildCharaTEXtChunk", () => {
  it("produces valid tEXt chunk structure", () => {
    const json = '{"spec":"chara_card_v2","data":{"name":"Test"}}';
    const chunk = buildCharaTEXtChunk(json);

    // Verify chunk type is "tEXt"
    expect(chunk[4]).toBe(0x74); // t
    expect(chunk[5]).toBe(0x45); // E
    expect(chunk[6]).toBe(0x58); // X
    expect(chunk[7]).toBe(0x74); // t
  });

  it("starts with correct length field", () => {
    const json = '{"name":"A"}';
    const chunk = buildCharaTEXtChunk(json);
    const view = new DataView(chunk.buffer);
    const length = view.getUint32(0);

    // Length = keyword "chara" (5) + null (1) + base64 string length
    const b64Len = btoa(json).length;
    expect(length).toBe(5 + 1 + b64Len);
  });

  it("contains keyword 'chara' followed by null separator", () => {
    const json = '{"test":true}';
    const chunk = buildCharaTEXtChunk(json);

    // Keyword starts at offset 8 (after length + type)
    const keyword = String.fromCharCode(chunk[8], chunk[9], chunk[10], chunk[11], chunk[12]);
    expect(keyword).toBe("chara");
    expect(chunk[13]).toBe(0); // null separator
  });

  it("contains base64-encoded JSON payload", () => {
    const json = '{"spec":"chara_card_v2","data":{"name":"Test"}}';
    const chunk = buildCharaTEXtChunk(json);

    // Extract base64 payload (after keyword + null at offset 14)
    const payloadStart = 14; // 8 (header) + 5 (keyword) + 1 (null)
    const view = new DataView(chunk.buffer);
    const dataLen = view.getUint32(0);
    const payloadEnd = 8 + dataLen;
    const payloadBytes = chunk.slice(payloadStart, payloadEnd);
    const b64Str = String.fromCharCode(...payloadBytes);

    // Decode and verify round-trip
    const decoded = atob(b64Str);
    const parsed = JSON.parse(decoded);
    expect(parsed.spec).toBe("chara_card_v2");
    expect(parsed.data.name).toBe("Test");
  });

  it("has correct total chunk size (4+4+data+4)", () => {
    const json = '{"x":1}';
    const chunk = buildCharaTEXtChunk(json);
    const view = new DataView(chunk.buffer);
    const dataLen = view.getUint32(0);

    expect(chunk.length).toBe(4 + 4 + dataLen + 4);
  });

  it("round-trips with the PNG import parser logic", () => {
    const json = '{"spec":"chara_card_v2","spec_version":"2.0","data":{"name":"RoundTrip","description":"test"}}';
    const chunk = buildCharaTEXtChunk(json);

    // Simulate what png-metadata.ts extractCharacterFromPng does:
    // Find null separator in chunk data, extract base64 after it
    const dataStart = 8;
    const view = new DataView(chunk.buffer);
    const dataLen = view.getUint32(0);
    const chunkData = chunk.slice(dataStart, dataStart + dataLen);

    const nullIdx = chunkData.indexOf(0);
    expect(nullIdx).toBeGreaterThan(0);

    const keywordBytes = chunkData.slice(0, nullIdx);
    const keyword = new TextDecoder("latin1").decode(keywordBytes);
    expect(keyword).toBe("chara");

    // Extract base64 and decode (matching png-metadata.ts logic)
    const b64Bytes = chunkData.slice(nullIdx + 1);
    let b64Str = "";
    for (let i = 0; i < b64Bytes.length; i++) {
      b64Str += String.fromCharCode(b64Bytes[i]);
    }
    const binaryStr = atob(b64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const jsonStr = new TextDecoder("utf-8").decode(bytes);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.spec).toBe("chara_card_v2");
    expect(parsed.data.name).toBe("RoundTrip");
    expect(parsed.data.description).toBe("test");
  });
});
