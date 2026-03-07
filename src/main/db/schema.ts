import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const connectionProfiles = sqliteTable("connection_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("ollama"),
  endpoint: text("endpoint").notNull(),
  isActive: integer("is_active").notNull().default(0),
  defaultModel: text("default_model"),
  contentTier: text("content_tier"),
  apiKey: text("api_key"),
  createdAt: text("created_at").notNull(),
  lastUsed: text("last_used"),
});

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  portraitUrl: text("portrait_url"),
  description: text("description"),
  personality: text("personality"),
  scenario: text("scenario"),
  firstMessage: text("first_message"),
  alternateGreetings: text("alternate_greetings"), // JSON array
  systemPrompt: text("system_prompt"),
  postHistoryInstructions: text("post_history_instructions"),
  exampleDialogues: text("example_dialogues"), // JSON array
  creatorNotes: text("creator_notes"),
  tags: text("tags"), // JSON array
  contentTier: text("content_tier").default("sfw"),
  creatorName: text("creator_name"),
  characterVersion: text("character_version"),
  sourceUrl: text("source_url"),
  specVersion: text("spec_version").default("v2"),
  importDate: text("import_date"),
  createdAt: text("created_at").notNull(),
  lastChatted: text("last_chatted"),
  tokenCount: integer("token_count").default(0),
  internalNotes: text("internal_notes"),
  source: text("source").default("local"),
  communityRefJson: text("community_ref_json"),
});

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  title: text("title").default(""),
  characterId: text("character_id").notNull(),
  personaName: text("persona_name").default(""),
  modelId: text("model_id").notNull(),
  modelName: text("model_name").notNull(),
  createdAt: text("created_at").notNull(),
  lastMessageAt: text("last_message_at"),
  messageCount: integer("message_count").default(0),
  bookmarkCount: integer("bookmark_count").default(0),
  wordCount: integer("word_count").default(0),
  tags: text("tags").default("[]"),
  /** ID of the leaf message on the currently active branch */
  activeLeafId: text("active_leaf_id"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  role: text("role").notNull(),
  content: text("content").default(""),
  timestamp: text("timestamp").notNull(),
  tokenCount: integer("token_count").default(0),
  isSystemMessage: integer("is_system_message").default(0),
  model: text("model"),
  generationTimeMs: integer("generation_time_ms"),
  swipeIndex: integer("swipe_index"),
  swipeCount: integer("swipe_count"),
  /** Which character spoke this message (assistant messages in group chats) */
  characterId: text("character_id"),
  /** Parent message ID for branching (NULL = root message or legacy) */
  parentId: text("parent_id"),
  /** Position among siblings sharing the same parent (0 = original, 1+ = forks) */
  branchPosition: integer("branch_position").default(0),
});

export const swipeAlternatives = sqliteTable("swipe_alternatives", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  index: integer("index").notNull(),
  content: text("content").default(""),
  tokenCount: integer("token_count").default(0),
  generationTimeMs: integer("generation_time_ms").default(0),
  model: text("model").notNull(),
});

export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  chatId: text("chat_id").notNull(),
  label: text("label").default(""),
  color: text("color").default("indigo"),
  messageIndex: integer("message_index").default(0),
  createdAt: text("created_at").notNull(),
});

export const sceneDirections = sqliteTable("scene_directions", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().unique(),
  text: text("text").default(""),
  injectionDepth: integer("injection_depth").default(4),
  enabled: integer("enabled").default(0),
  tokenCount: integer("token_count").default(0),
});

export const generationPresets = sqliteTable("generation_presets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  temperature: real("temperature").default(1.0),
  repetitionPenalty: real("repetition_penalty").default(1.1),
  topP: real("top_p").default(0.95),
  topPEnabled: integer("top_p_enabled").default(1),
  topK: integer("top_k").default(40),
  topKEnabled: integer("top_k_enabled").default(0),
  maxNewTokens: integer("max_new_tokens").default(512),
  stopSequences: text("stop_sequences").default("[]"),
});

export const lorebookEntries = sqliteTable("lorebook_entries", {
  id: text("id").primaryKey(),
  characterId: text("character_id").notNull(),
  lorebookId: text("lorebook_id"),
  keywords: text("keywords"), // JSON array
  content: text("content"),
  insertionPosition: text("insertion_position").default("before_character"),
  priority: integer("priority").default(50),
  enabled: integer("enabled").default(1),
  logic: text("logic").notNull().default("AND_ANY"),
  probability: integer("probability").notNull().default(100),
  scanDepth: integer("scan_depth").notNull().default(0),
});

export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  avatarUrl: text("avatar_url").default(""),
  isDefault: integer("is_default").default(0),
  lastUsed: text("last_used"),
  createdAt: text("created_at").notNull(),
});

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  coverUrl: text("cover_url").default(""),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").notNull(),
});

export const characterCollections = sqliteTable(
  "character_collections",
  {
    characterId: text("character_id").notNull(),
    collectionId: text("collection_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.characterId, table.collectionId] })]
);

export const lorebooks = sqliteTable("lorebooks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tags: text("tags").default("[]"), // JSON array
  coverColor: text("cover_color").default("zinc"),
  lastModified: text("last_modified"),
  createdAt: text("created_at").notNull(),
});

export const lorebookCharacters = sqliteTable(
  "lorebook_characters",
  {
    lorebookId: text("lorebook_id").notNull(),
    characterId: text("character_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.lorebookId, table.characterId] })]
);

export const discoverCards = sqliteTable("discover_cards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  portraitUrl: text("portrait_url").default(""),
  tags: text("tags").default("[]"), // JSON array
  contentTier: text("content_tier").default("sfw"),
  creatorName: text("creator_name").notNull(),
  creatorAvatarUrl: text("creator_avatar_url").default(""),
  descriptionPreview: text("description_preview").default(""),
  likeCount: integer("like_count").default(0),
  importCount: integer("import_count").default(0),
  lorebookEntryCount: integer("lorebook_entry_count").default(0),
  specVersion: text("spec_version").default("v2"),
  publishedAt: text("published_at"),
  hasUpdate: integer("has_update").default(0),
});

export const discoverLikes = sqliteTable("discover_likes", {
  cardId: text("card_id").primaryKey(),
});

export const discoverFollows = sqliteTable("discover_follows", {
  creatorName: text("creator_name").primaryKey(),
});

// ── Story Structure ────────────────────────────────────

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("drafting"),
  coverImage: text("cover_image"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  wordCount: integer("word_count").default(0),
  sceneCount: integer("scene_count").default(0),
});

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  sourceChatId: text("source_chat_id"),
  wordCount: integer("word_count").default(0),
  status: text("status").notNull().default("draft"),
  sceneNotes: text("scene_notes").default(""),
  blockCount: integer("block_count").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const contentBlocks = sqliteTable("content_blocks", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id").notNull(),
  position: integer("position").notNull().default(0),
  bookmarkLabel: text("bookmark_label").default(""),
  speaker: text("speaker").default(""),
  hidden: integer("hidden").default(0),
  sourceMessageId: text("source_message_id").default(""),
  text: text("text").default(""),
});

export const chatCharacters = sqliteTable(
  "chat_characters",
  {
    chatId: text("chat_id").notNull(),
    characterId: text("character_id").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.characterId] })]
);

export const projectCharacters = sqliteTable(
  "project_characters",
  {
    projectId: text("project_id").notNull(),
    characterId: text("character_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.characterId] })]
);

export const projectLorebooks = sqliteTable(
  "project_lorebooks",
  {
    projectId: text("project_id").notNull(),
    lorebookId: text("lorebook_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.lorebookId] })]
);
