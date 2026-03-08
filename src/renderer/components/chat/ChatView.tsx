import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Settings,
  List,
  Cpu,
  X,
  Search,
  Download,
  FileText,
  BookOpen,
  FileJson,
  Plus,
  Trash2,
  GitBranch,
  Image,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatRoleplayProps, ExportScope, ExportFormat } from '@shared/chat-types'
import { getSiblingInfo } from '@/lib/branch-utils'
import { applySubstitutions } from '@/lib/substitution-utils'
import { MessageBubble } from './MessageBubble'
import { ChatComposer } from './ChatComposer'
import { SceneSidebar } from './SceneSidebar'
import { GroupCharacterStrip } from './GroupCharacterStrip'
import { BranchPanel } from './BranchPanel'
import { SpritePanel } from './SpritePanel'
import { ImageGenPanel } from './ImageGenPanel'
import { useTtsPlayback } from '@/lib/tts-playback'
import type { TtsProviderType } from '@shared/tts-types'

export function ChatView({
  chat,
  messages,
  isGenerating,
  streamingContent,
  swipingMessageId,
  sceneDirection,
  tokenBudget,
  activePreset,
  presets,
  chatList,
  bookmarks,
  inputMode,
  availableModels,
  onStopGeneration,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
  onSwipeNavigate,
  onSwipeGenerate,
  onBookmark,
  onRemoveBookmark,
  onJumpToBookmark,
  onUpdateSceneDirection,
  onSetInjectionDepth,
  onToggleSceneDirection,
  onChangeInputMode,
  onUpdatePreset,
  onSavePreset,
  onLoadPreset,
  onSwitchModel,
  onOpenChat,
  onDeleteChat,
  onNewChat,
  onRenameChat,
  onOpenCharacterEditor,
  onExportChat,
  branchInfo,
  branchPointActive,
  onBranchCreate,
  onBranchNavigate,
  onBranchSwitch,
  onBranchDelete,
  onToggleSidebar,
  pendingCharacterId,
  generatingCharacter,
  onSelectCharacter,
  onTalkativenessChange,
  onReplyStrategyChange,
  onAutoContinueChange,
  allCharacters,
  onAddCharacter,
  onRemoveCharacter,
  quickReplies,
  regexRulesMap,
  ttsEnabled,
  ttsDefaultProvider,
  ttsDefaultVoice,
}: ChatRoleplayProps) {
  const tts = useTtsPlayback()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [branchPanelOpen, setBranchPanelOpen] = useState(false)
  const [spritePanelOpen, setSpritePanelOpen] = useState(false)
  const [imageGenPanelOpen, setImageGenPanelOpen] = useState(false)
  const [chatListOpen, setChatListOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [addCharMenuOpen, setAddCharMenuOpen] = useState(false)
  const [addCharMenuPos, setAddCharMenuPos] = useState({ top: 0, left: 0 })
  const addCharBtnRef = useRef<HTMLButtonElement>(null)

  function openAddCharMenu() {
    const rect = addCharBtnRef.current?.getBoundingClientRect()
    if (rect) setAddCharMenuPos({ top: rect.bottom + 6, left: rect.left })
    setAddCharMenuOpen(true)
  }
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages.length, streamingContent])

  function handleToggleSidebar() {
    setSidebarOpen(!sidebarOpen)
    onToggleSidebar?.()
  }

  const handlePlayTts = useCallback((messageId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    const charId = msg.characterId || chat.characterId
    tts.playMessage(
      messageId,
      msg.content,
      charId,
      msg.expression,
      (ttsDefaultProvider as TtsProviderType) || undefined,
      ttsDefaultVoice || undefined,
    )
  }, [messages, chat.characterId, tts, ttsDefaultProvider, ttsDefaultVoice])

  const filteredChatList = chatList.filter((c) =>
    !chatSearchQuery ||
    c.title.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
    c.characterName.toLowerCase().includes(chatSearchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 backdrop-blur">
        {/* Character info */}
        {chat.characters && chat.characters.length > 1 ? (
          /* Group chat: show avatar stack + all names + add/remove controls */
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {chat.characters.slice(0, 4).map((char) => (
                <div key={char.id} className="group relative ring-2 ring-zinc-900 rounded-full">
                  {char.portraitUrl ? (
                    <img src={char.portraitUrl} alt={char.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600/30 to-indigo-800/30 text-xs font-bold text-indigo-300">
                      {char.name.charAt(0)}
                    </div>
                  )}
                  {/* Remove button — only show if not the primary character */}
                  {char.id !== chat.characterId && onRemoveCharacter && (
                    <button
                      onClick={() => onRemoveCharacter(char.id)}
                      title={`Remove ${char.name}`}
                      className="absolute -right-0.5 -top-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-white group-hover:flex"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <span
              className="text-sm font-semibold text-zinc-200"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {chat.characters.length > 2
                ? `${chat.characters[0].name} & ${chat.characters.length - 1} others`
                : chat.characters.map(c => c.name).join(' & ')}
            </span>
            {/* Add character button */}
            {onAddCharacter && (
              <button
                ref={addCharBtnRef}
                onClick={openAddCharMenu}
                title="Add participant"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          /* Single character */
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onOpenCharacterEditor?.(chat.characterId)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-800"
            >
              {chat.characterPortraitUrl ? (
                <img
                  src={chat.characterPortraitUrl}
                  alt={chat.characterName}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-indigo-500/20"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600/30 to-indigo-800/30 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
                  {chat.characterName.charAt(0)}
                </div>
              )}
              <span
                className="text-sm font-semibold text-zinc-200"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {chat.characterName}
              </span>
            </button>
            {/* Add a second character to start a group chat */}
            {onAddCharacter && (
              <button
                ref={addCharBtnRef}
                onClick={openAddCharMenu}
                title="Add participant"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Model pill */}
        <div className="relative">
          <button
            onClick={() => setModelMenuOpen(!modelMenuOpen)}
            className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
          >
            <Cpu className="h-3 w-3" />
            {chat.modelName}
          </button>
          {modelMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setModelMenuOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSwitchModel?.(model.id)
                      setModelMenuOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-xs',
                      model.id === chat.modelId
                        ? 'bg-zinc-700/40 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-700/30 hover:text-zinc-200'
                    )}
                  >
                    <span>{model.name}</span>
                    <span className="text-[10px] text-zinc-600">
                      {(model.contextLength / 1024).toFixed(0)}k
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Sprite panel toggle */}
        <button
          onClick={() => setSpritePanelOpen(!spritePanelOpen)}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-zinc-800',
            spritePanelOpen ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
          )}
          title={spritePanelOpen ? 'Hide sprites' : 'Show sprites'}
        >
          <Image className="h-4 w-4" />
        </button>

        {/* Image gen panel toggle */}
        <button
          onClick={() => setImageGenPanelOpen(!imageGenPanelOpen)}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-zinc-800',
            imageGenPanelOpen ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
          )}
          title={imageGenPanelOpen ? 'Hide image gen' : 'Generate images'}
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            title="Export chat"
          >
            <Download className="h-4 w-4" />
          </button>
          {exportMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {([
                  { scope: 'full' as ExportScope, label: 'Full transcript', icon: FileText },
                  { scope: 'bookmarks' as ExportScope, label: 'Bookmarked scenes', icon: BookOpen },
                  { scope: 'raw' as ExportScope, label: 'Raw JSON', icon: FileJson },
                ]).map(({ scope, label, icon: Icon }) => (
                  <div key={scope}>
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      <Icon className="h-3 w-3" />
                      {label}
                    </div>
                    <div className="flex gap-1 px-3 pb-2">
                      {(['txt', 'md', 'json'] as ExportFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => {
                            onExportChat?.(chat.id, scope, fmt)
                            setExportMenuOpen(false)
                          }}
                          className="rounded bg-zinc-700/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                        >
                          .{fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Settings (toggles sidebar) */}
        <button
          onClick={handleToggleSidebar}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-zinc-800',
            sidebarOpen ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
          )}
          title={sidebarOpen ? 'Hide settings' : 'Show settings'}
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Chat list toggle */}
        <button
          onClick={() => setChatListOpen(!chatListOpen)}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-zinc-800',
            chatListOpen ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
          )}
          title="Chat history"
        >
          <List className="h-4 w-4" />
        </button>

        {/* Branch panel toggle */}
        <button
          onClick={() => setBranchPanelOpen(!branchPanelOpen)}
          className={cn(
            'rounded-md p-1.5 transition-colors hover:bg-zinc-800 hover:text-zinc-300',
            branchPanelOpen ? 'text-indigo-400' : 'text-zinc-500'
          )}
          title={branchPanelOpen ? 'Hide branches' : 'Show branches'}
        >
          <GitBranch className="h-4 w-4" />
        </button>

      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Sprite panel */}
        {spritePanelOpen && (() => {
          // Derive expression and character from last assistant message
          const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
          const spriteCharId = lastAssistant?.characterId || chat.characterId
          const spriteCharName = (() => {
            if (lastAssistant?.characterId && chat.characters?.length > 1) {
              const c = chat.characters.find(ch => ch.id === lastAssistant.characterId)
              if (c) return c.name
            }
            return chat.characterName
          })()
          return (
            <SpritePanel
              characterId={spriteCharId}
              characterName={spriteCharName}
              expression={lastAssistant?.expression ?? null}
              defaultExpression="neutral"
              onClose={() => setSpritePanelOpen(false)}
            />
          )
        })()}

        {/* Chat list panel */}
        {chatListOpen && (
          <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 p-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-1.5 pl-8 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50"
                  />
                </div>
                <button
                  onClick={() => onNewChat?.()}
                  className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-indigo-400"
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChatListOpen(false)}
                  className="rounded-md p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredChatList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onOpenChat?.(c.id)
                    setChatListOpen(false)
                  }}
                  className={cn(
                    'group/item flex w-full items-center gap-2.5 border-b border-zinc-800/50 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/50',
                    c.id === chat.id && 'bg-indigo-500/5 border-l-2 border-l-indigo-500'
                  )}
                >
                  {c.characterPortraitUrl ? (
                    <img
                      src={c.characterPortraitUrl}
                      alt={c.characterName}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-500">
                      {c.characterName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-300">
                      {c.title || 'Untitled chat'}
                    </p>
                    <p className="truncate text-[10px] text-zinc-500">{c.characterName}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-600">
                      <span>{c.messageCount} msgs</span>
                      {c.wordCount > 0 && <span>{c.wordCount.toLocaleString()} words</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat?.(c.id)
                    }}
                    className="shrink-0 rounded-md p-1 text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/item:opacity-100"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={threadRef} className="flex-1 overflow-y-auto py-4">
            {messages.map((msg, idx) => {
              // In group chats, resolve per-message character identity
              let charName = chat.characterName
              let charPortrait = chat.characterPortraitUrl
              if (msg.characterId && chat.characters && chat.characters.length > 1) {
                const charInfo = chat.characters.find(c => c.id === msg.characterId)
                if (charInfo) {
                  charName = charInfo.name
                  charPortrait = charInfo.portraitUrl
                }
              }
              // Apply per-character regex substitutions to assistant messages
              const charRules = msg.role === 'assistant' && msg.characterId
                ? regexRulesMap?.[msg.characterId]
                : msg.role === 'assistant'
                  ? regexRulesMap?.[chat.characterId]
                  : undefined
              const displayMsg = charRules?.length
                ? { ...msg, content: applySubstitutions(msg.content, charRules) }
                : msg
              const sibling = getSiblingInfo(branchInfo ?? null, msg.id)
              return (
                <MessageBubble
                  key={msg.id}
                  message={displayMsg}
                  characterName={charName}
                  characterInitial={charName.charAt(0)}
                  characterPortraitUrl={charPortrait}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onRegenerate={onRegenerate}
                  onSwipeNavigate={onSwipeNavigate}
                  onSwipeGenerate={onSwipeGenerate}
                  onBookmark={onBookmark}
                  onRemoveBookmark={onRemoveBookmark}
                  onBranch={onBranchCreate}
                  onBranchNavigate={onBranchNavigate}
                  siblingCount={sibling?.total}
                  siblingIndex={sibling?.index}
                  isLastMessage={idx === messages.length - 1}
                  isSwipeStreaming={swipingMessageId === msg.id && isGenerating}
                  swipeStreamingContent={swipingMessageId === msg.id ? streamingContent : undefined}
                  ttsEnabled={ttsEnabled}
                  onPlayTts={handlePlayTts}
                  onStopTts={tts.stopPlayback}
                  isTtsPlaying={tts.isPlaying(msg.id)}
                  isTtsLoading={tts.isLoading(msg.id)}
                />
              )
            })}

            {/* Branch point indicator */}
            {!isGenerating && messages.length > 0 && (() => {
              if (branchPointActive) {
                return (
                  <div className="mx-auto max-w-lg px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-400">
                      <GitBranch className="h-3 w-3" />
                      Branched — send a message to continue on this path
                    </div>
                  </div>
                )
              }
              const lastMsg = messages[messages.length - 1]
              const sibling = getSiblingInfo(branchInfo ?? null, lastMsg.id)
              if (sibling && sibling.total > 1) {
                return (
                  <div className="mx-auto max-w-lg px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-400">
                      <GitBranch className="h-3 w-3" />
                      Branch {sibling.index + 1} of {sibling.total}
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {/* Streaming response bubble */}
            {isGenerating && (
              <div className="flex gap-3 px-6 py-3">
                {(generatingCharacter?.portraitUrl ?? chat.characterPortraitUrl) ? (
                  <img
                    src={generatingCharacter?.portraitUrl ?? chat.characterPortraitUrl}
                    alt={generatingCharacter?.name ?? chat.characterName}
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-indigo-500/20"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600/30 to-indigo-800/30 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
                    {(generatingCharacter?.name ?? chat.characterName).charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-medium text-indigo-400">
                    {generatingCharacter?.name ?? chat.characterName}
                  </p>
                  <div className="rounded-2xl rounded-tl-sm bg-zinc-800/60 px-4 py-3 text-sm leading-relaxed text-zinc-300">
                    {streamingContent ? (
                      <span className="whitespace-pre-wrap">{streamingContent}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" style={{ animationDelay: '0.2s' }} />
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" style={{ animationDelay: '0.4s' }} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group character selector */}
          {chat.characters && chat.characters.length > 1 && pendingCharacterId && onSelectCharacter && (
            <GroupCharacterStrip
              characters={chat.characters}
              pendingCharacterId={pendingCharacterId}
              isGenerating={!!isGenerating}
              replyStrategy={chat.replyStrategy ?? 'round_robin'}
              onSelectCharacter={onSelectCharacter}
              onTalkativenessChange={onTalkativenessChange}
              onReplyStrategyChange={onReplyStrategyChange}
              autoContinue={chat.autoContinue ?? false}
              onAutoContinueChange={onAutoContinueChange}
            />
          )}

          {/* Composer */}
          <ChatComposer
            inputMode={inputMode}
            sceneDirection={sceneDirection}
            isGenerating={isGenerating}
            onSendMessage={onSendMessage}
            onStopGeneration={onStopGeneration}
            onChangeInputMode={onChangeInputMode}
            onUpdateSceneDirection={onUpdateSceneDirection}
            onSetInjectionDepth={onSetInjectionDepth}
            onToggleSceneDirection={onToggleSceneDirection}
            quickReplies={quickReplies}
          />
        </div>

        {/* Branch panel */}
        {branchPanelOpen && onBranchSwitch && onBranchDelete && (
          <BranchPanel
            chatId={chat.id}
            onSwitchBranch={onBranchSwitch}
            onDeleteBranch={onBranchDelete}
            onClose={() => setBranchPanelOpen(false)}
          />
        )}

        {/* Image generation panel */}
        {imageGenPanelOpen && (
          <ImageGenPanel
            chatId={chat.id}
            characterId={chat.characterId}
            characterName={chat.characterName}
            onClose={() => setImageGenPanelOpen(false)}
            onPortraitSet={() => {
              // Portrait was updated server-side; no local state to refresh here
            }}
          />
        )}

        {/* Scene sidebar */}
        {sidebarOpen && (
          <SceneSidebar
            chat={chat}
            tokenBudget={tokenBudget}
            activePreset={activePreset}
            presets={presets}
            bookmarks={bookmarks}
            availableModels={availableModels}
            sceneDirection={sceneDirection}
            onUpdatePreset={onUpdatePreset}
            onSavePreset={onSavePreset}
            onLoadPreset={onLoadPreset}
            onJumpToBookmark={onJumpToBookmark}
            onSwitchModel={onSwitchModel}
            onUpdateSceneDirection={onUpdateSceneDirection}
            onSetInjectionDepth={onSetInjectionDepth}
            onToggleSceneDirection={onToggleSceneDirection}
            onReplyStrategyChange={onReplyStrategyChange}
            onAutoContinueChange={onAutoContinueChange}
            onTalkativenessChange={onTalkativenessChange}
          />
        )}
      </div>

      {/* Add participant dropdown — rendered at root to escape header stacking context */}
      {addCharMenuOpen && onAddCharacter && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAddCharMenuOpen(false)} />
          <div
            className="fixed z-50 w-64 rounded-xl border border-zinc-600 max-h-72 overflow-y-auto"
            style={{
              top: addCharMenuPos.top,
              left: addCharMenuPos.left,
              backgroundColor: '#1a1a24',
              boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
            }}
          >
            <div className="border-b border-zinc-700 px-3 py-2 rounded-t-xl" style={{ backgroundColor: 'rgba(63,63,70,0.6)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Add participant</p>
            </div>
            {(allCharacters ?? [])
              .filter(c => !chat.characters.some(cc => cc.id === c.id))
              .map(char => (
                <button
                  key={char.id}
                  onClick={() => { onAddCharacter(char.id); setAddCharMenuOpen(false) }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-zinc-100 hover:bg-white/5 transition-colors"
                >
                  {char.portraitUrl ? (
                    <img src={char.portraitUrl} alt={char.name} className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-zinc-600" />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                      {char.name.charAt(0)}
                    </div>
                  )}
                  {char.name}
                </button>
              ))}
            {(allCharacters ?? []).filter(c => !chat.characters.some(cc => cc.id === c.id)).length === 0 && (
              <p className="px-3 py-3 text-xs text-zinc-500">No more characters to add</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
