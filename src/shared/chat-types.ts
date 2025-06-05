/** Message author role */
export type MessageRole = 'user' | 'assistant' | 'system'

/** Input composer mode */
export type InputMode = 'in_character' | 'narrate' | 'continue'

/** Bookmark accent color */
export type BookmarkColor = 'indigo' | 'teal' | 'amber' | 'rose' | 'zinc'

/** Chat export format */
export type ExportFormat = 'txt' | 'md' | 'json'

/** Chat export scope */
export type ExportScope = 'full' | 'bookmarks' | 'raw'

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

export interface Bookmark {
  id: string
  messageId: string
  label: string
  color: BookmarkColor
  messageIndex: number
  createdAt: string
}

export interface SwipeAlternative {
  index: number
  content: string
  tokenCount: number
  generationTimeMs: number
  model: string
}

export interface Message {
  id: string
  chatId: string
  role: MessageRole
  content: string
  timestamp: string
  tokenCount: number
  isSystemMessage: boolean
  /** Model ID used for generation (assistant messages only) */
  model?: string
  /** Generation time in milliseconds (assistant messages only) */
  generationTimeMs?: number
  /** Current swipe index (assistant messages only) */
  swipeIndex?: number
  /** Total number of swipe alternatives (assistant messages only) */
  swipeCount?: number
  /** Bookmark on this message, if any */
  bookmark: Bookmark | null
}

export interface SceneDirection {
  text: string
  injectionDepth: number
  enabled: boolean
  tokenCount: number
}

export interface TokenBudget {
  contextMax: number
  systemPrompt: number
  characterCard: number
  chatHistory: number
  sceneDirection: number
  available: number
  scrollingOutSoon: boolean
}

export interface GenerationPreset {
  id: string
  name: string
  temperature: number
  repetitionPenalty: number
  topP: number
  topPEnabled: boolean
  topK: number
  topKEnabled: boolean
  maxNewTokens: number
  stopSequences: string[]
}

export interface Chat {
  id: string
  title: string
  characterId: string
  characterName: string
  characterPortraitUrl: string
  characterTags: string[]
  personaName: string
  modelId: string
  modelName: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
  bookmarkCount: number
  wordCount: number
  tags: string[]
}

export interface ChatListItem {
  id: string
  title: string
  characterName: string
  characterPortraitUrl: string
  lastMessageAt: string | null
  messageCount: number
  bookmarkCount: number
  wordCount: number
  tags: string[]
}

export interface AvailableModel {
  id: string
  name: string
  contextLength: number
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ChatRoleplayProps {
  // Data
  chat: Chat
  messages: Message[]
  swipeAlternatives: Record<string, SwipeAlternative[]>
  sceneDirection: SceneDirection
  tokenBudget: TokenBudget
  activePreset: GenerationPreset
  presets: GenerationPreset[]
  chatList: ChatListItem[]
  bookmarks: Bookmark[]
  inputMode: InputMode
  availableModels: AvailableModel[]

  // Message actions
  /** Called when user sends a message */
  onSendMessage?: (content: string, mode: InputMode) => void
  /** Called when user edits a message inline */
  onEditMessage?: (messageId: string, newContent: string) => void
  /** Called when user deletes a message */
  onDeleteMessage?: (messageId: string) => void
  /** Called when user regenerates an AI response */
  onRegenerate?: (messageId: string) => void

  // Swipe actions
  /** Called when user navigates to a different swipe alternative */
  onSwipeNavigate?: (messageId: string, direction: 'left' | 'right') => void
  /** Called when user generates a new swipe alternative */
  onSwipeGenerate?: (messageId: string) => void

  // Bookmark actions
  /** Called when user bookmarks a message */
  onBookmark?: (messageId: string, label: string, color: BookmarkColor) => void
  /** Called when user removes a bookmark */
  onRemoveBookmark?: (bookmarkId: string) => void
  /** Called when user clicks a bookmark to jump to that message */
  onJumpToBookmark?: (messageId: string) => void

  // Scene direction
  /** Called when user updates the scene direction text */
  onUpdateSceneDirection?: (text: string) => void
  /** Called when user changes injection depth */
  onSetInjectionDepth?: (depth: number) => void
  /** Called when user toggles scene direction on/off */
  onToggleSceneDirection?: (enabled: boolean) => void

  // Input mode
  /** Called when user switches input mode */
  onChangeInputMode?: (mode: InputMode) => void

  // Generation controls
  /** Called when user changes a generation parameter */
  onUpdatePreset?: (updates: Partial<GenerationPreset>) => void
  /** Called when user saves current settings as a named preset */
  onSavePreset?: (name: string) => void
  /** Called when user loads a saved preset */
  onLoadPreset?: (presetId: string) => void
  /** Called when user deletes a preset */
  onDeletePreset?: (presetId: string) => void

  // Model switching
  /** Called when user switches the active model */
  onSwitchModel?: (modelId: string) => void

  // Chat management
  /** Called when user opens a different chat from the list */
  onOpenChat?: (chatId: string) => void
  /** Called when user renames the current chat */
  onRenameChat?: (chatId: string, title: string) => void
  /** Called when user opens the character editor */
  onOpenCharacterEditor?: (characterId: string) => void

  // Export
  /** Called when user exports the chat */
  onExportChat?: (chatId: string, scope: ExportScope, format: ExportFormat) => void

  // Sidebar
  /** Called when user toggles the scene sidebar */
  onToggleSidebar?: () => void
}
