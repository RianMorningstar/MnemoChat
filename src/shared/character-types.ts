import type { ContentTier } from "./types";

export type SpecVersion = "v1" | "v2";
export type InsertionPosition = "before_character" | "after_character" | "before_example" | "after_example";
export type SortOption = "name" | "created" | "lastChatted" | "tokenCount";

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
}

export interface LorebookEntry {
  id: string;
  characterId: string;
  keywords: string[];
  content: string | null;
  insertionPosition: InsertionPosition;
  priority: number;
  enabled: boolean;
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
