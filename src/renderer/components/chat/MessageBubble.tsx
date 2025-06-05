import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw,
  Bookmark,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message, BookmarkColor } from '@shared/chat-types'

interface MessageBubbleProps {
  message: Message
  characterName?: string
  characterInitial?: string
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onRegenerate?: (messageId: string) => void
  onSwipeNavigate?: (messageId: string, direction: 'left' | 'right') => void
  onSwipeGenerate?: (messageId: string) => void
  onBookmark?: (messageId: string, label: string, color: BookmarkColor) => void
  onRemoveBookmark?: (bookmarkId: string) => void
}

function renderContent(text: string): React.ReactNode[] {
  // Split on *asterisk blocks* and render them as italic/dimmed
  const parts = text.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="not-italic text-zinc-400" style={{ fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </em>
      )
    }
    // Handle "quoted dialogue" — render in standard weight
    const quoteParts = part.split(/("[^"]*")/g)
    if (quoteParts.length > 1) {
      return quoteParts.map((qp, qi) => {
        if (qp.startsWith('"') && qp.endsWith('"')) {
          return (
            <span key={`${i}-${qi}`} className="text-zinc-100">
              {qp}
            </span>
          )
        }
        return <span key={`${i}-${qi}`}>{qp}</span>
      })
    }
    return <span key={i}>{part}</span>
  })
}

export function MessageBubble({
  message,
  characterName,
  characterInitial,
  onEdit,
  onDelete,
  onRegenerate,
  onSwipeNavigate,
  onSwipeGenerate,
  onBookmark,
  onRemoveBookmark,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)

  if (message.isSystemMessage) {
    return (
      <div className="mx-auto max-w-lg px-4 py-3 text-center">
        <p className="text-xs leading-relaxed text-zinc-500 italic">
          {message.content}
        </p>
      </div>
    )
  }

  const isAssistant = message.role === 'assistant'
  const isUser = message.role === 'user'

  function handleSaveEdit() {
    onEdit?.(message.id, editContent)
    setEditing(false)
  }

  function handleCancelEdit() {
    setEditContent(message.content)
    setEditing(false)
  }

  return (
    <div
      className={cn('group relative px-4 py-3', isUser && 'flex justify-end')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Bookmark indicator */}
      {message.bookmark && (
        <div className="absolute -left-0.5 top-3 flex items-center gap-1.5">
          <div
            className={cn(
              'h-5 w-1 rounded-r',
              message.bookmark.color === 'indigo' && 'bg-indigo-400',
              message.bookmark.color === 'teal' && 'bg-teal-400',
              message.bookmark.color === 'amber' && 'bg-amber-400',
              message.bookmark.color === 'rose' && 'bg-rose-400',
              message.bookmark.color === 'zinc' && 'bg-zinc-400'
            )}
          />
        </div>
      )}

      {/* AI Message */}
      {isAssistant && (
        <div className="relative max-w-none">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600/30 to-indigo-800/30 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
              {characterInitial || 'A'}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">
                  {characterName || 'Assistant'}
                </span>
                {message.swipeCount && message.swipeCount > 1 && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500">
                    {(message.swipeIndex ?? 0) + 1} / {message.swipeCount}
                  </span>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full resize-y rounded-lg border border-indigo-500/40 bg-zinc-900 px-3 py-2 font-mono text-sm leading-[1.75] text-zinc-200 outline-none focus:border-indigo-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400"
                    >
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-l-2 border-indigo-500/30 pl-4">
                  <p className="whitespace-pre-wrap text-sm leading-[1.75] text-zinc-300">
                    {renderContent(message.content)}
                  </p>
                </div>
              )}

              {/* Hover metadata */}
              {hovered && !editing && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-600">
                  {message.model && <span>{message.model}</span>}
                  <span>{message.tokenCount} tok</span>
                  {message.generationTimeMs && (
                    <span>{(message.generationTimeMs / 1000).toFixed(1)}s</span>
                  )}
                  <span>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hover actions */}
          {hovered && !editing && (
            <div className="absolute -top-1 right-0 flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5 shadow-lg">
              {/* Swipe left (generate new) */}
              <button
                onClick={() => onSwipeGenerate?.(message.id)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                title="Generate new alternative"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {/* Swipe right (navigate existing) */}
              {message.swipeCount && message.swipeCount > 1 && (
                <button
                  onClick={() => onSwipeNavigate?.(message.id, 'right')}
                  className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                  title="Next alternative"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="mx-0.5 h-4 w-px bg-zinc-700" />
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRegenerate?.(message.id)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                title="Regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() =>
                  message.bookmark
                    ? onRemoveBookmark?.(message.bookmark.id)
                    : onBookmark?.(message.id, '', 'indigo')
                }
                className={cn(
                  'rounded p-1.5 transition-colors hover:bg-zinc-700',
                  message.bookmark
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
                title={message.bookmark ? 'Remove bookmark' : 'Bookmark'}
              >
                <Bookmark className="h-3.5 w-3.5" fill={message.bookmark ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onDelete?.(message.id)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Message */}
      {isUser && (
        <div className="relative max-w-[75%]">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-lg border border-indigo-500/40 bg-zinc-900 px-3 py-2 font-mono text-sm leading-[1.75] text-zinc-200 outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-br-md bg-zinc-800/60 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-[1.7] text-zinc-300">
                {renderContent(message.content)}
              </p>
            </div>
          )}

          {/* Hover actions */}
          {hovered && !editing && (
            <div className="absolute -top-1 left-0 flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5 shadow-lg">
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRegenerate?.(message.id)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                title="Regenerate AI response"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() =>
                  message.bookmark
                    ? onRemoveBookmark?.(message.bookmark.id)
                    : onBookmark?.(message.id, '', 'indigo')
                }
                className={cn(
                  'rounded p-1.5 transition-colors hover:bg-zinc-700',
                  message.bookmark
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
                title={message.bookmark ? 'Remove bookmark' : 'Bookmark'}
              >
                <Bookmark className="h-3.5 w-3.5" fill={message.bookmark ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onDelete?.(message.id)}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
