import { Heart, Download, UserPlus, X, BookOpen, FileCode } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { DiscoverCard } from './types'

interface CardDetailOverlayProps {
  card: DiscoverCard
  onClose?: () => void
  onImport?: () => void
  onLike?: () => void
  onFollowCreator?: () => void
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
  steampunk: 'from-orange-900/60 to-orange-950/80',
}

function getGradient(tags: string[]): string {
  for (const tag of tags) {
    if (tagColors[tag]) return tagColors[tag]
  }
  return 'from-zinc-800/60 to-zinc-900/80'
}

export function CardDetailOverlay({
  card,
  onClose,
  onImport,
  onLike,
  onFollowCreator,
  onOpenCreatorProfile,
}: CardDetailOverlayProps) {
  const { t } = useTranslation('library')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="hidden w-[45%] shrink-0 md:block">
          {card.portraitUrl ? (
            <img
              src={card.portraitUrl}
              alt={card.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={cn('flex h-full items-center justify-center bg-gradient-to-br', getGradient(card.tags))}>
              <span className="text-8xl font-bold text-zinc-500/40">
                {card.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>

          <h2
            className="text-xl font-bold text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {card.name}
          </h2>
          <button
            onClick={onOpenCreatorProfile}
            className="mt-1 text-sm text-indigo-400 transition-colors hover:text-indigo-300"
          >
            by @{card.creatorName}
          </button>

          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
            <span>Published {new Date(card.publishedAt).toLocaleDateString()}</span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> {formatCount(card.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" /> {t('detail.imports', { count: card.importCount })}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400"
              >
                {tag}
              </span>
            ))}
            {card.contentTier === 'nsfw' && (
              <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-400">
                NSFW
              </span>
            )}
          </div>

          <div className="mt-5">
            <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              {t('detail.description')}
            </h4>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
              {card.description || card.descriptionPreview}
            </p>
          </div>

          {card.greeting && (
            <div className="mt-5">
              <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {t('detail.greetingPreview')}
              </h4>
              <p className="text-sm leading-relaxed text-zinc-400 italic line-clamp-4">
                {card.greeting}
              </p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-4">
            {card.pov && (
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-400">
                {card.pov}
              </span>
            )}
            {card.lorebookEntryCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <BookOpen className="h-3.5 w-3.5" />
                {t('detail.lorebookEntries', { count: card.lorebookEntryCount })}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <FileCode className="h-3.5 w-3.5" />
              {t('detail.spec', { version: card.specVersion.toUpperCase() })}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onImport}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
            >
              <Download className="h-4 w-4" />
              {t('import.importToLibrary')}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onLike}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
              >
                <Heart className="h-4 w-4" />
                {t('detail.like')}
              </button>
              <button
                onClick={onFollowCreator}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
              >
                <UserPlus className="h-4 w-4" />
                {t('detail.follow', { name: card.creatorName })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
