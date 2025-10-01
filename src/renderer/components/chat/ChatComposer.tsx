import { useState } from 'react'
import {
  Send,
  Square,
  MessageSquare,
  BookOpen,
  Pen,
  ChevronDown,
  ChevronUp,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InputMode, SceneDirection } from '@shared/chat-types'

interface ChatComposerProps {
  inputMode: InputMode
  sceneDirection: SceneDirection
  isGenerating?: boolean
  onSendMessage?: (content: string, mode: InputMode) => void
  onStopGeneration?: () => void
  onChangeInputMode?: (mode: InputMode) => void
  onUpdateSceneDirection?: (text: string) => void
  onSetInjectionDepth?: (depth: number) => void
  onToggleSceneDirection?: (enabled: boolean) => void
}

const modes: { id: InputMode; label: string; icon: typeof MessageSquare; description: string }[] = [
  { id: 'in_character', label: 'In Character', icon: MessageSquare, description: 'Speak as your persona' },
  { id: 'narrate', label: 'Narrate', icon: BookOpen, description: 'Third-person prose' },
  { id: 'continue', label: 'Continue', icon: Pen, description: 'AI extends its last message' },
]

export function ChatComposer({
  inputMode,
  sceneDirection,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onChangeInputMode,
  onUpdateSceneDirection,
  onSetInjectionDepth,
  onToggleSceneDirection,
}: ChatComposerProps) {
  const [message, setMessage] = useState('')
  const [sceneExpanded, setSceneExpanded] = useState(false)
  const [showModeMenu, setShowModeMenu] = useState(false)

  const activeMode = modes.find((m) => m.id === inputMode) || modes[0]
  const ActiveIcon = activeMode.icon

  function handleSend() {
    if (inputMode === 'continue') {
      onSendMessage?.(message, 'continue')
      setMessage('')
      return
    }
    if (!message.trim()) return
    onSendMessage?.(message.trim(), inputMode)
    setMessage('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const charCount = message.length
  const approxTokens = Math.ceil(charCount / 4)

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80">
      {/* Scene Direction strip */}
      <div
        className={cn(
          'border-b border-zinc-800/60 transition-all',
          sceneExpanded ? 'bg-zinc-900' : 'bg-zinc-900/40'
        )}
      >
        <button
          onClick={() => setSceneExpanded(!sceneExpanded)}
          className="flex w-full items-center gap-2 px-4 py-1.5 text-left"
        >
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
            Scene Direction
          </span>
          {sceneDirection.enabled && sceneDirection.text && (
            <span className="truncate text-[11px] text-zinc-500">
              {!sceneExpanded && sceneDirection.text}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {sceneDirection.enabled && (
              <span className="text-[10px] tabular-nums text-zinc-600">
                depth: {sceneDirection.injectionDepth}
              </span>
            )}
            {sceneExpanded ? (
              <ChevronUp className="h-3 w-3 text-zinc-600" />
            ) : (
              <ChevronDown className="h-3 w-3 text-zinc-600" />
            )}
          </span>
        </button>

        {sceneExpanded && (
          <div className="px-4 pb-3">
            <textarea
              value={sceneDirection.text}
              onChange={(e) => onUpdateSceneDirection?.(e.target.value)}
              rows={3}
              placeholder="Guide the AI's direction for this scene..."
              className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50"
            />
            <div className="mt-2 flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                Injection depth:
                <input
                  type="number"
                  value={sceneDirection.injectionDepth}
                  onChange={(e) => onSetInjectionDepth?.(Number(e.target.value))}
                  min={1}
                  max={20}
                  className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-center text-[10px] tabular-nums text-zinc-300 outline-none"
                />
              </label>
              <button
                onClick={() => onToggleSceneDirection?.(!sceneDirection.enabled)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                  sceneDirection.enabled
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'bg-zinc-800 text-zinc-500'
                )}
              >
                {sceneDirection.enabled ? 'Active' : 'Disabled'}
              </button>
              {sceneDirection.text && (
                <span className="text-[10px] tabular-nums text-zinc-600">
                  ~{sceneDirection.tokenCount} tok
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 px-3 py-2">
        {/* Mode selector */}
        <div className="relative mb-1">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className={cn(
              'flex h-[38px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
              inputMode === 'in_character' && 'bg-indigo-500/15 text-indigo-400',
              inputMode === 'narrate' && 'bg-teal-500/15 text-teal-400',
              inputMode === 'continue' && 'bg-amber-500/15 text-amber-400'
            )}
            title={activeMode.description}
          >
            <ActiveIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{activeMode.label}</span>
          </button>

          {showModeMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowModeMenu(false)} />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {modes.map((mode) => {
                  const Icon = mode.icon
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        onChangeInputMode?.(mode.id)
                        setShowModeMenu(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                        inputMode === mode.id
                          ? 'bg-zinc-700/50 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-700/30 hover:text-zinc-200'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="text-xs font-medium">{mode.label}</div>
                        <div className="text-[10px] text-zinc-500">{mode.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Input */}
        <div className="relative min-w-0 flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              inputMode === 'continue'
                ? 'Optional direction for continuation...'
                : inputMode === 'narrate'
                  ? 'Write a narrative beat...'
                  : 'Write your message...'
            }
            className="max-h-40 min-h-[38px] w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 py-2 pl-4 pr-12 text-sm leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-500/50"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          {/* Char/token count */}
          {charCount > 0 && (
            <div className="absolute bottom-2 right-12 flex items-center gap-1 text-[10px] tabular-nums text-zinc-600">
              <Hash className="h-2.5 w-2.5" />
              {approxTokens}
            </div>
          )}
        </div>

        {/* Send / Stop */}
        <div className="mb-1">
          {isGenerating ? (
            <button
              onClick={onStopGeneration}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-red-500/80 text-white transition-colors hover:bg-red-500"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={inputMode !== 'continue' && !message.trim()}
              className={cn(
                'flex h-[38px] w-[38px] items-center justify-center rounded-xl transition-colors',
                inputMode !== 'continue' && !message.trim()
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
