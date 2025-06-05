import { useState, useRef, useEffect } from 'react'
import {
  Settings,
  List,
  PanelRightClose,
  PanelRight,
  Cpu,
  X,
  Search,
  Download,
  FileText,
  BookOpen,
  FileJson,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatRoleplayProps, ExportScope, ExportFormat } from '@shared/chat-types'
import { MessageBubble } from './MessageBubble'
import { ChatComposer } from './ChatComposer'
import { SceneSidebar } from './SceneSidebar'

export function ChatView({
  chat,
  messages,
  sceneDirection,
  tokenBudget,
  activePreset,
  presets,
  chatList,
  bookmarks,
  inputMode,
  availableModels,
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
  onRenameChat,
  onOpenCharacterEditor,
  onExportChat,
  onToggleSidebar,
}: ChatRoleplayProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatListOpen, setChatListOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages.length])

  function handleToggleSidebar() {
    setSidebarOpen(!sidebarOpen)
    onToggleSidebar?.()
  }

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
        <button
          onClick={() => onOpenCharacterEditor?.(chat.characterId)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-zinc-800"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600/30 to-indigo-800/30 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
            {chat.characterName.charAt(0)}
          </div>
          <span
            className="text-sm font-semibold text-zinc-200"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {chat.characterName}
          </span>
        </button>

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

        {/* Settings */}
        <button
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Settings"
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

        {/* Sidebar toggle */}
        <button
          onClick={handleToggleSidebar}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
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
                    'flex w-full items-start gap-2.5 border-b border-zinc-800/50 px-3 py-3 text-left transition-colors hover:bg-zinc-800/50',
                    c.id === chat.id && 'bg-indigo-500/5 border-l-2 border-l-indigo-500'
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-500">
                    {c.characterName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-300">
                      {c.title || 'Untitled chat'}
                    </p>
                    <p className="text-[10px] text-zinc-600">{c.characterName}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                      <span>{c.messageCount} msgs</span>
                      {c.bookmarkCount > 0 && <span>{c.bookmarkCount} bm</span>}
                      {c.wordCount > 0 && <span>{c.wordCount.toLocaleString()} words</span>}
                    </div>
                    {c.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={threadRef} className="flex-1 overflow-y-auto py-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                characterName={chat.characterName}
                characterInitial={chat.characterName.charAt(0)}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onRegenerate={onRegenerate}
                onSwipeNavigate={onSwipeNavigate}
                onSwipeGenerate={onSwipeGenerate}
                onBookmark={onBookmark}
                onRemoveBookmark={onRemoveBookmark}
              />
            ))}
          </div>

          {/* Composer */}
          <ChatComposer
            inputMode={inputMode}
            sceneDirection={sceneDirection}
            onSendMessage={onSendMessage}
            onChangeInputMode={onChangeInputMode}
            onUpdateSceneDirection={onUpdateSceneDirection}
            onSetInjectionDepth={onSetInjectionDepth}
            onToggleSceneDirection={onToggleSceneDirection}
          />
        </div>

        {/* Scene sidebar */}
        {sidebarOpen && (
          <SceneSidebar
            chat={chat}
            tokenBudget={tokenBudget}
            activePreset={activePreset}
            presets={presets}
            bookmarks={bookmarks}
            onUpdatePreset={onUpdatePreset}
            onSavePreset={onSavePreset}
            onLoadPreset={onLoadPreset}
            onJumpToBookmark={onJumpToBookmark}
          />
        )}
      </div>
    </div>
  )
}
