import type { ContentTier } from "./types";

export type CharacterSource = "local" | "imported" | "community";
export type LibraryContentType = "characters" | "lorebooks" | "personas";
export type LibraryTab = "my-library" | "discover";
export type DiscoverFeedTab =
  | "featured"
  | "trending"
  | "new"
  | "following"
  | "recommended";
export type GridDensity = "comfortable" | "compact" | "list";
export type LibrarySortOption =
  | "last_chatted"
  | "last_imported"
  | "alphabetical"
  | "most_chatted"
  | "date_created";
export type LorebookColor = "indigo" | "teal" | "amber" | "rose" | "zinc";
export type CardSpecVersion = "v1" | "v2" | "v3";

export interface CommunityRef {
  cardId: string;
  creatorName: string;
  hasUpdate: boolean;
}

export interface LibraryCharacter {
  id: string;
  name: string;
  portraitUrl: string;
  tags: string[];
  contentTier: ContentTier;
  lastChatted: string | null;
  messageCount: number;
  tokenCount: number;
  collectionIds: string[];
  source: CharacterSource;
  communityRef: CommunityRef | null;
  lorebookCount: number;
  hasPortrait: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  memberCount: number;
  createdAt: string;
}

export interface LibraryLorebook {
  id: string;
  name: string;
  entryCount: number;
  tags: string[];
  attachedCharacterIds: string[];
  attachedCharacterNames: string[];
  lastModified: string;
  coverColor: LorebookColor;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  isDefault: boolean;
  lastUsed: string;
}

export interface DiscoverCard {
  id: string;
  name: string;
  portraitUrl: string;
  tags: string[];
  contentTier: ContentTier;
  creatorName: string;
  creatorAvatarUrl: string;
  descriptionPreview: string;
  likeCount: number;
  importCount: number;
  lorebookEntryCount: number;
  specVersion: CardSpecVersion;
  publishedAt: string;
  hasUpdate: boolean;
}

export interface CreatorProfile {
  username: string;
  bio: string;
  avatarUrl: string;
  publishedCardCount: number;
  followerCount: number;
  isFollowing: boolean;
}

export interface LibrarySortOptionItem {
  id: LibrarySortOption;
  label: string;
}

export interface LibraryGalleryProps {
  libraryCharacters: LibraryCharacter[];
  collections: Collection[];
  lorebooks: LibraryLorebook[];
  personas: Persona[];
  discoverCards: DiscoverCard[];
  discoverFeedTabs: DiscoverFeedTab[];
  creatorProfile: CreatorProfile;
  availableTags: string[];
  sortOptions: LibrarySortOptionItem[];
  gridDensity: GridDensity;
  activeContentType: LibraryContentType;
  activeTab: LibraryTab;
  onChangeTab?: (tab: LibraryTab) => void;
  onChangeContentType?: (type: LibraryContentType) => void;
  onChangeDiscoverFeed?: (feed: DiscoverFeedTab) => void;
  onChat?: (characterId: string) => void;
  onEdit?: (characterId: string) => void;
  onExport?: (characterId: string, format: "png" | "json") => void;
  onDuplicate?: (characterId: string) => void;
  onDelete?: (characterId: string) => void;
  onAddToCollection?: (characterId: string, collectionId: string) => void;
  onChangeGridDensity?: (density: GridDensity) => void;
  onSort?: (option: LibrarySortOption) => void;
  onFilterTags?: (tags: string[]) => void;
  onFilterContentTier?: (tier: ContentTier | null) => void;
  onFilterSource?: (source: CharacterSource | null) => void;
  onFilterCollection?: (collectionId: string | null) => void;
  onSearch?: (query: string) => void;
  onCreateCollection?: (name: string) => void;
  onRenameCollection?: (collectionId: string, name: string) => void;
  onDeleteCollection?: (collectionId: string) => void;
  onOpenCollection?: (collectionId: string) => void;
  onEditLorebook?: (lorebookId: string) => void;
  onAttachLorebook?: (lorebookId: string, characterIds: string[]) => void;
  onExportLorebook?: (lorebookId: string) => void;
  onDuplicateLorebook?: (lorebookId: string) => void;
  onDeleteLorebook?: (lorebookId: string) => void;
  onEditPersona?: (personaId: string) => void;
  onSetDefaultPersona?: (personaId: string) => void;
  onDuplicatePersona?: (personaId: string) => void;
  onDeletePersona?: (personaId: string) => void;
  onImportCard?: (cardId: string) => void;
  onLikeCard?: (cardId: string) => void;
  onOpenCardDetail?: (cardId: string) => void;
  onFollowCreator?: (creatorName: string) => void;
  onOpenCreatorProfile?: (creatorName: string) => void;
  onBulkExport?: (characterIds: string[]) => void;
  onBulkDelete?: (characterIds: string[]) => void;
  onBulkTag?: (characterIds: string[], tags: string[]) => void;
  onBulkAddToCollection?: (
    characterIds: string[],
    collectionId: string
  ) => void;
  onImportPng?: (file: File) => void;
}
