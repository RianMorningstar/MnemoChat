import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, WifiOff, ShieldOff, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DiscoverCard as DiscoverCardType,
  DiscoverFeedTab,
  GridDensity,
} from './types'
import type { DiscoverQuery } from '@shared/library-types'
import { DiscoverCard } from './DiscoverCard'
import { CardDetailOverlay } from './CardDetailOverlay'
import { getDiscoverCards, getDiscoverCard, likeDiscoverCard, importDiscoverCard } from '@/lib/api'

interface DiscoverFeedProps {
  feedTabs: DiscoverFeedTab[]
  gridDensity?: GridDensity
  onImportCard?: (cardId: string) => void
  onFollowCreator?: (creatorName: string) => void
  onOpenCreatorProfile?: (creatorName: string) => void
}

const feedLabels: Record<DiscoverFeedTab, string> = {
  featured: 'Featured',
  trending: 'Trending',
  new: 'New',
  following: 'Following',
  recommended: 'For You',
}

const feedToSort: Record<DiscoverFeedTab, DiscoverQuery['sort']> = {
  featured: 'latest',
  trending: 'trending',
  new: 'latest',
  following: 'following',
  recommended: 'gems',
}

export function DiscoverFeed({
  feedTabs,
  gridDensity = 'comfortable',
  onImportCard,
  onFollowCreator,
  onOpenCreatorProfile,
}: DiscoverFeedProps) {
  const [activeFeed, setActiveFeed] = useState<DiscoverFeedTab>('featured')
  const [showNsfw, setShowNsfw] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState<DiscoverCardType | null>(null)
  const [cards, setCards] = useState<DiscoverCardType[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  // Fetch cards when feed/search changes
  const fetchCards = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const result = await getDiscoverCards({
        sort: feedToSort[activeFeed],
        search: debouncedSearch || undefined,
        showNsfw: showNsfw || undefined,
        page: pageNum,
        pageSize: 20,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
      }

      if (append) {
        setCards((prev) => [...prev, ...result.cards])
      } else {
        setCards(result.cards)
      }
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeFeed, debouncedSearch, showNsfw])

  // Reset and fetch on tab/search change
  useEffect(() => {
    fetchCards(0, false)
  }, [fetchCards])

  function handleLoadMore() {
    fetchCards(page + 1, true)
  }

  async function handleOpenDetail(card: DiscoverCardType) {
    setSelectedCard(card)
    // Fetch full details
    try {
      const full = await getDiscoverCard(card.id)
      setSelectedCard(full)
    } catch {
      // Keep the preview data
    }
  }

  async function handleLike(cardId: string) {
    try {
      const result = await likeDiscoverCard(cardId)
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, isLiked: result.liked } : c
        )
      )
      if (selectedCard?.id === cardId) {
        setSelectedCard((prev) => prev ? { ...prev, isLiked: result.liked } : null)
      }
    } catch (err) {
      console.error('Failed to like card:', err)
    }
  }

  async function handleImport(cardId: string) {
    try {
      await importDiscoverCard(cardId)
      onImportCard?.(cardId)
    } catch (err) {
      console.error('Failed to import card:', err)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-800 px-6">
        {feedTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFeed(tab)}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters, creators, tags..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
        </div>
        <button
          onClick={() => setShowNsfw((v) => !v)}
          title={showNsfw ? 'Showing NSFW content — click to hide' : 'NSFW content hidden — click to show'}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
            showNsfw
              ? 'border-red-700/50 bg-red-900/30 text-red-400 hover:bg-red-900/50'
              : 'border-zinc-700 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
          )}
        >
          {showNsfw ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
          NSFW
        </button>
      </div>

      {error && (
        <div className="mx-6 mb-3 flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Could not connect to community server. Check your internet connection.</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <p className="text-sm">
              {debouncedSearch
                ? 'No characters found matching your search.'
                : activeFeed === 'following'
                  ? 'Follow creators to see their characters here.'
                  : 'No characters available.'}
            </p>
          </div>
        ) : (
          <>
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
                  onImport={() => handleImport(card.id)}
                  onLike={() => handleLike(card.id)}
                  onOpenCreatorProfile={() => onOpenCreatorProfile?.(card.creatorName)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedCard && (
        <CardDetailOverlay
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onImport={() => {
            handleImport(selectedCard.id)
            setSelectedCard(null)
          }}
          onLike={() => handleLike(selectedCard.id)}
          onFollowCreator={() => onFollowCreator?.(selectedCard.creatorName)}
          onOpenCreatorProfile={() => onOpenCreatorProfile?.(selectedCard.creatorName)}
        />
      )}
    </div>
  )
}
