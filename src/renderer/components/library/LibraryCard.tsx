import { useState } from 'react'
import {
  MessageSquare,
  Pencil,
  Download,
  Copy,
  FolderPlus,
  Trash2,
  MoreHorizontal,
  BookOpen,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LibraryCharacter, GridDensity } from './types'

interface LibraryCardProps {
  character: LibraryCharacter
  density: GridDensity
  onChat?: () => void
  onEdit?: () => void
  onExport?: (format: 'png' | 'json') => void
  onDuplicate?: () => void
  onAddToCollection?: () => void
  onDelete?: () => void
}

const tagColors: Record<string, string> = {
  fantasy: 'from-indigo-900/60 to-indigo-950/80',
  'sci-fi': 'from-teal-900/60 to-teal-950/80',
  cyberpunk: 'from-violet-900/60 to-violet-950/80',
  modern: 'from-zinc-700/60 to-zinc-800/80',
  horror: 'from-red-900/60 to-red-950/80',
  comedy: 'from-amber-900/60 to-amber-950/80',
  drama: 'from-rose-900/60 to-rose-950/80',
  literary: 'from-stone-700/60 to-stone-800/80',
  steampunk: 'from-orange-900/60 to-orange-950/80',
}

function getTagGradient(tags: string[]): string {
  for (const tag of tags) {
    if (tagColors[tag]) return tagColors[tag]
  }
  return 'from-zinc-800/60 to-zinc-900/80'
}

function timeAgo(date: string | null): string {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export function LibraryCard({
  character,
  density,
  onChat,
  onEdit,
  onExport,
  onDuplicate,
  onAddToCollection,
  onDelete,
}: LibraryCardProps) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  if (density === 'list') {
    return (
      <div className="group flex items-center gap-4 border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-zinc-700/50 to-zinc-800">
          {character.hasPortrait ? (
            <span className="text-sm font-bold text-zinc-500">{character.name.charAt(0)}</span>
          ) : (
            <span className="text-sm font-bold text-zinc-600">{character.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-200">{character.name}</p>
          <div className="flex items-center gap-2">
            {character.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] text-zinc-500">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6 text-[11px] tabular-nums text-zinc-500">
          <span>{character.messageCount} msgs</span>
          <span>{timeAgo(character.lastChatted)}</span>
          <span>{character.tokenCount} tok</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onChat} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200">
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button onClick={onEdit} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  const isCompact = density === 'compact'

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setMenuOpen(false)
      }}
    >
      <div className={cn('relative overflow-hidden', isCompact ? 'aspect-[3/4]' : 'aspect-[3/4]')}>
        {character.hasPortrait ? (
          <div className={cn('flex h-full items-center justify-center bg-gradient-to-br', getTagGradient(character.tags))}>
            <span className={cn('font-bold text-zinc-500/60', isCompact ? 'text-4xl' : 'text-6xl')}>
              {character.name.charAt(0)}
            </span>
          </div>
        ) : (
          <div className={cn('flex h-full items-center justify-center bg-gradient-to-br', getTagGradient(character.tags))}>
            <span className={cn('font-bold text-zinc-500/40', isCompact ? 'text-4xl' : 'text-6xl')}>
              {character.name.charAt(0)}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn('truncate font-semibold text-white', isCompact ? 'text-xs' : 'text-sm')}
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {character.name}
              </h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {character.tags.slice(0, isCompact ? 2 : 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
                {character.tags.length > (isCompact ? 2 : 3) && (
                  <span className="text-[9px] text-white/40">
                    +{character.tags.length - (isCompact ? 2 : 3)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChat?.()
              }}
              className="shrink-0 rounded-full bg-indigo-500/80 p-1.5 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-indigo-400 group-hover:opacity-100"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {character.source === 'community' && (
          <div className="absolute left-2 top-2 rounded-full bg-teal-500/80 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            Community
          </div>
        )}

        {character.communityRef?.hasUpdate && (
          <div className="absolute right-2 top-2">
            <AlertCircle className="h-4 w-4 text-amber-400 drop-shadow" />
          </div>
        )}

        {character.lorebookCount > 0 && !hovered && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] text-zinc-300 backdrop-blur-sm">
            <BookOpen className="h-3 w-3" />
            {character.lorebookCount}
          </div>
        )}

        {hovered && (
          <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-3 backdrop-blur-[2px]">
            <div className="flex justify-end">
              <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
                {character.tokenCount} tok
              </span>
            </div>
            <div>
              <div className="mb-2 space-y-1 text-[10px] text-zinc-400">
                <div>Last chatted: {timeAgo(character.lastChatted)}</div>
                <div>{character.messageCount} messages</div>
                {character.collectionIds.length > 0 && (
                  <div>{character.collectionIds.length} collection(s)</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onChat?.() }}
                  className="flex-1 rounded-md bg-indigo-500 py-1.5 text-center text-[11px] font-medium text-white transition-colors hover:bg-indigo-400"
                >
                  Chat
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                  className="rounded-md bg-zinc-700/80 p-1.5 text-zinc-300 transition-colors hover:bg-zinc-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onExport?.('png') }}
                  className="rounded-md bg-zinc-700/80 p-1.5 text-zinc-300 transition-colors hover:bg-zinc-600"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                    className="rounded-md bg-zinc-700/80 p-1.5 text-zinc-300 transition-colors hover:bg-zinc-600"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  {menuOpen && (
                    <div className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate?.(); setMenuOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-700"
                      >
                        <Copy className="h-3 w-3" /> Duplicate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToCollection?.(); setMenuOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-700"
                      >
                        <FolderPlus className="h-3 w-3" /> Add to Collection
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); setMenuOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-zinc-700"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
