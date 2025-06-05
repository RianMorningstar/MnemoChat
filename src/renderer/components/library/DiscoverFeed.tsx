import { useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DiscoverCard as DiscoverCardType,
  DiscoverFeedTab,
  GridDensity,
} from './types'
import { DiscoverCard } from './DiscoverCard'
import { CardDetailOverlay } from './CardDetailOverlay'

interface DiscoverFeedProps {
  cards: DiscoverCardType[]
  feedTabs: DiscoverFeedTab[]
  gridDensity?: GridDensity
  onChangeDiscoverFeed?: (feed: DiscoverFeedTab) => void
  onImportCard?: (cardId: string) => void
  onLikeCard?: (cardId: string) => void
  onOpenCardDetail?: (cardId: string) => void
  onFollowCreator?: (creatorName: string) => void
  onOpenCreatorProfile?: (creatorName: string) => void
  onSearch?: (query: string) => void
}

const feedLabels: Record<DiscoverFeedTab, string> = {
  featured: 'Featured',
  trending: 'Trending',
  new: 'New',
  following: 'Following',
  recommended: 'For You',
}

export function DiscoverFeed({
  cards,
  feedTabs,
  gridDensity = 'comfortable',
  onChangeDiscoverFeed,
  onImportCard,
  onLikeCard,
  onOpenCardDetail,
  onFollowCreator,
  onOpenCreatorProfile,
  onSearch,
}: DiscoverFeedProps) {
  const [activeFeed, setActiveFeed] = useState<DiscoverFeedTab>('featured')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<DiscoverCardType | null>(null)

  function handleOpenDetail(card: DiscoverCardType) {
    setSelectedCard(card)
    onOpenCardDetail?.(card.id)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-800 px-6">
        {feedTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveFeed(tab)
              onChangeDiscoverFeed?.(tab)
            }}
            className={cn(
              'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeFeed === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {feedLabels[tab]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              onSearch?.(e.target.value)
            }}
            placeholder="Search characters, creators, tags..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div
          className={cn(
            'grid gap-3',
            gridDensity === 'compact'
              ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          )}
        >
          {cards.map((card) => (
            <DiscoverCard
              key={card.id}
              card={card}
              density={gridDensity}
              onOpenDetail={() => handleOpenDetail(card)}
              onImport={() => onImportCard?.(card.id)}
              onLike={() => onLikeCard?.(card.id)}
              onOpenCreatorProfile={() => onOpenCreatorProfile?.(card.creatorName)}
            />
          ))}
        </div>
      </div>

      {selectedCard && (
        <CardDetailOverlay
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onImport={() => {
            onImportCard?.(selectedCard.id)
            setSelectedCard(null)
          }}
          onLike={() => onLikeCard?.(selectedCard.id)}
          onFollowCreator={() => onFollowCreator?.(selectedCard.creatorName)}
          onOpenCreatorProfile={() => onOpenCreatorProfile?.(selectedCard.creatorName)}
        />
      )}
    </div>
  )
}
