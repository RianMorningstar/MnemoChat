import type { ContentTier } from "./types";

export interface QuickReply {
  label: string;
  content: string;
}

export interface RegexSubstitution {
  pattern: string;
  replacement: string;
  flags: string;
  enabled: boolean;
}

export type SpecVersion = "v1" | "v2";
export type InsertionPosition = "before_character" | "after_character" | "before_example" | "after_example";
export type LorebookLogic = "AND_ANY" | "AND_ALL" | "NOT_ANY" | "NOT_ALL";
export type SortOption = "name" | "created" | "lastChatted" | "tokenCount";

export interface CharacterGenerationOverrides {
  temperature?: number | null;
  topP?: number | null;
  topPEnabled?: boolean;
  topK?: number | null;
  topKEnabled?: boolean;
  repetitionPenalty?: number | null;
  maxNewTokens?: number | null;
  stopSequences?: string[];
}

export interface Character {
  id: string;
  name: string;
  portraitUrl: string | null;
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
  contentTier: ContentTier;
  creatorName: string | null;
  characterVersion: string | null;
  sourceUrl: string | null;
  specVersion: SpecVersion;
  importDate: string | null;
  createdAt: string;
  lastChatted: string | null;
  tokenCount: number;
  internalNotes: string | null;
  lorebookEntryCount?: number;
  generationOverrides?: CharacterGenerationOverrides | null;
  authorNote?: string | null;
  authorNoteDepth?: number;
  quickReplies?: QuickReply[] | null;
  regexSubstitutions?: RegexSubstitution[] | null;
}

export interface LorebookEntry {
  id: string;
  characterId: string;
  keywords: string[];
  content: string | null;
  insertionPosition: InsertionPosition;
  priority: number;
  enabled: boolean;
  logic: LorebookLogic;
  probability: number;
  scanDepth: number;
}

export interface ImportPreview {
  name: string;
  description: string | null;
  portraitUrl: string | null;
  tags: string[];
  creatorName: string | null;
  characterVersion: string | null;
  tokenCount: number;
}

export interface SortOptionItem {
  value: SortOption;
  label: string;
}

export interface LibraryStats {
  totalCharacters: number;
  sfwCount: number;
  nsfwCount: number;
  totalLorebook: number;
}
