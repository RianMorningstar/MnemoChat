import { Heart, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoverCard as DiscoverCardType, GridDensity } from './types'

interface DiscoverCardProps {
  card: DiscoverCardType
  density?: GridDensity
  onOpenDetail?: () => void
  onImport?: () => void
  onLike?: () => void
  onOpenCreatorProfile?: () => void
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const tagColors: Record<string, string> = {
  fantasy: 'from-indigo-900/60 to-indigo-950/80',
  'sci-fi': 'from-teal-900/60 to-teal-950/80',
  cyberpunk: 'from-violet-900/60 to-violet-950/80',
  modern: 'from-zinc-700/60 to-zinc-800/80',
  horror: 'from-red-900/60 to-red-950/80',
  comedy: 'from-amber-900/60 to-amber-950/80',
  steampunk: 'from-orange-900/60 to-orange-950/80',
}

function getTagGradient(tags: string[]): string {
  for (const tag of tags) {
    if (tagColors[tag]) return tagColors[tag]
  }
  return 'from-zinc-800/60 to-zinc-900/80'
}

export function DiscoverCard({
  card,
  density = 'comfortable',
  onOpenDetail,
  onImport,
  onLike,
  onOpenCreatorProfile,
}: DiscoverCardProps) {
  const isCompact = density === 'compact'

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
      onClick={onOpenDetail}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <div className={cn('flex h-full items-center justify-center bg-gradient-to-br', getTagGradient(card.tags))}>
          <span className={cn('font-bold text-zinc-500/50', isCompact ? 'text-4xl' : 'text-6xl')}>
            {card.name.charAt(0)}
          </span>
        </div>

        {card.contentTier === 'nsfw' && (
          <div className="absolute left-2 top-2 rounded-full bg-rose-500/80 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            NSFW
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3
            className={cn('truncate font-semibold text-white', isCompact ? 'text-xs' : 'text-sm')}
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {card.name}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenCreatorProfile?.()
            }}
            className="mt-0.5 text-[11px] text-indigo-300/80 transition-colors hover:text-indigo-300"
          >
            by @{card.creatorName}
          </button>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.tags.slice(0, isCompact ? 2 : 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLike?.()
              }}
              className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500/30 hover:text-rose-300"
            >
              <Heart className="h-3 w-3" />
              {formatCount(card.likeCount)}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onImport?.()
              }}
              className="flex items-center gap-1 rounded-full bg-indigo-500/80 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-indigo-400"
            >
              <Download className="h-3 w-3" />
              Import
            </button>
            <span className="ml-auto text-[9px] tabular-nums text-white/40">
              {formatCount(card.importCount)} imports
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
