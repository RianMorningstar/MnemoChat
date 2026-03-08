import type { QuickReply, RegexSubstitution } from './character-types'

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

/** Group chat reply strategy */
export type ReplyStrategy = 'round_robin' | 'random' | 'weighted_random'

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
  /** Which character spoke this message (assistant messages in group chats) */
  characterId?: string | null
  /** Bookmark on this message, if any */
  bookmark: Bookmark | null
  /** Parent message ID for branching (null = root message or legacy) */
  parentId?: string | null
  /** Position among siblings sharing the same parent (0 = original, 1+ = forks) */
  branchPosition?: number
  /** Classified expression/emotion for sprite display */
  expression?: string | null
  /** Relative path to cached TTS audio file */
  ttsAudioPath?: string | null
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
  negativePrompt: string
  guidanceScale: number
}

export interface ChatCharacter {
  id: string
  name: string
  portraitUrl: string
  talkativeness: number
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
  /** All characters in this chat (includes primary). Empty for old chats without chat_characters rows. */
  characters: ChatCharacter[]
  /** ID of the leaf message on the currently active branch */
  activeLeafId?: string | null
  /** Group chat reply strategy */
  replyStrategy: ReplyStrategy
  /** Whether auto-continue is enabled for group chats */
  autoContinue: boolean
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
// Branching
// ---------------------------------------------------------------------------

export interface BranchChild {
  branchPosition: number
  childId: string
  isActive: boolean
  messageCount: number
  leafTimestamp: string
}

export interface ForkPoint {
  messageId: string
  activeBranchPosition: number
  branches: BranchChild[]
}

export interface BranchInfo {
  leafId: string
  forkPoints: ForkPoint[]
}

export interface BranchLeaf {
  leafId: string
  leafTimestamp: string
  depth: number
  lastContent: string
  isActive: boolean
  forkMessageId: string
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ChatRoleplayProps {
  // Data
  chat: Chat
  messages: Message[]
  isGenerating?: boolean
  streamingContent?: string
  swipingMessageId?: string | null
  swipeAlternatives: Record<string, SwipeAlternative[]>
  sceneDirection: SceneDirection
  tokenBudget: TokenBudget
  activePreset: GenerationPreset
  presets: GenerationPreset[]
  chatList: ChatListItem[]
  bookmarks: Bookmark[]
  inputMode: InputMode
  availableModels: AvailableModel[]
  quickReplies?: { character: QuickReply[]; global: QuickReply[] }
  regexRulesMap?: Record<string, RegexSubstitution[]>

  // Generation control
  /** Called to stop an in-progress generation */
  onStopGeneration?: () => void

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
  /** Called when user deletes a chat */
  onDeleteChat?: (chatId: string) => void
  /** Called when user starts a new chat with the current character */
  onNewChat?: () => void
  /** Called when user renames the current chat */
  onRenameChat?: (chatId: string, title: string) => void
  /** Called when user opens the character editor */
  onOpenCharacterEditor?: (characterId: string) => void

  // Export
  /** Called when user exports the chat */
  onExportChat?: (chatId: string, scope: ExportScope, format: ExportFormat) => void

  // Group chat
  /** The character currently selected to speak next (group chats only) */
  pendingCharacterId?: string
  /** The character currently streaming a response */
  generatingCharacter?: ChatCharacter
  /** Called when user selects a character to speak next */
  onSelectCharacter?: (characterId: string) => void
  /** Called when user changes a character's talkativeness */
  onTalkativenessChange?: (characterId: string, value: number) => void
  /** Called when user changes the group reply strategy */
  onReplyStrategyChange?: (strategy: ReplyStrategy) => void
  /** Called when user toggles auto-continue */
  onAutoContinueChange?: (enabled: boolean) => void

  // Branching
  /** Branch info for the current active branch path */
  branchInfo?: BranchInfo | null
  /** Whether the user just set a branch point (awaiting their message to fork) */
  branchPointActive?: boolean
  /** Called when user creates a branch from a message */
  onBranchCreate?: (messageId: string) => void
  /** Called when user navigates between sibling branches */
  onBranchNavigate?: (messageId: string, direction: 'prev' | 'next') => void
  /** Called when user switches to a specific branch by leaf ID */
  onBranchSwitch?: (leafId: string) => void
  /** Called when user deletes a branch */
  onBranchDelete?: (messageId: string) => void

  // Sidebar
  /** Called when user toggles the scene sidebar */
  onToggleSidebar?: () => void

  // Group chat participant management
  /** All characters available to add (for the picker) */
  allCharacters?: { id: string; name: string; portraitUrl: string }[]
  /** Called when user adds a character to the group */
  onAddCharacter?: (characterId: string) => void
  /** Called when user removes a character from the group */
  onRemoveCharacter?: (characterId: string) => void

  // TTS
  /** Whether TTS is globally enabled */
  ttsEnabled?: boolean
  /** Default TTS provider */
  ttsDefaultProvider?: string | null
  /** Default TTS voice */
  ttsDefaultVoice?: string | null
}
