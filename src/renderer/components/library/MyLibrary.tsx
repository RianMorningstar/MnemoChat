import { useState, useRef } from 'react'
import {
  Search,
  Grid3X3,
  LayoutGrid,
  List,
  Plus,
  BookOpen,
  Pencil,
  Download,
  Copy,
  Link2,
  Trash2,
  User,
  Star,
  ChevronDown,
  MoreHorizontal,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  LibraryGalleryProps,
  LibraryContentType,
  GridDensity,
  LibraryLorebook,
} from './types'
import type { ContentTier } from '@shared/types'
import { LibraryCard } from './LibraryCard'

type MyLibraryProps = Pick<
  LibraryGalleryProps,
  | 'libraryCharacters' | 'collections' | 'lorebooks' | 'personas'
  | 'sortOptions' | 'gridDensity' | 'activeContentType'
  | 'onChangeContentType' | 'onChat' | 'onEdit' | 'onExport'
  | 'onDuplicate' | 'onDelete' | 'onAddToCollection'
  | 'onChangeGridDensity' | 'onSort' | 'onFilterTags' | 'onFilterContentTier'
  | 'onFilterSource' | 'onFilterCollection' | 'onSearch'
  | 'onCreateCollection' | 'onOpenCollection' | 'onDeleteCollection'
  | 'onEditLorebook' | 'onAttachLorebook' | 'onExportLorebook'
  | 'onDuplicateLorebook' | 'onDeleteLorebook'
  | 'onEditPersona' | 'onSetDefaultPersona' | 'onDuplicatePersona' | 'onDeletePersona'
> & {
  onCreatePersona?: () => void;
  onImportCharacter?: (file: File) => void;
  onImportLorebook?: (file: File) => void;
  onImportPersona?: (file: File) => void;
}

export function MyLibrary({
  libraryCharacters,
  collections,
  lorebooks,
  personas,
  sortOptions,
  gridDensity,
  activeContentType,
  onChangeContentType,
  onChat,
  onEdit,
  onExport,
  onDuplicate,
  onDelete,
  onAddToCollection,
  onChangeGridDensity,
  onSort,
  onFilterContentTier,
  onFilterCollection,
  onSearch,
  onCreateCollection,
  onEditLorebook,
  onExportLorebook,
  onDuplicateLorebook,
  onDeleteLorebook,
  onEditPersona,
  onSetDefaultPersona,
  onDuplicatePersona,
  onDeletePersona,
  onCreatePersona,
  onImportCharacter,
  onImportLorebook,
  onImportPersona,
}: MyLibraryProps) {
  const charFileInputRef = useRef<HTMLInputElement>(null)
  const lorebookFileInputRef = useRef<HTMLInputElement>(null)
  const personaFileInputRef = useRef<HTMLInputElement>(null)
  const [charDragOver, setCharDragOver] = useState(false)
  const [lorebookDragOver, setLorebookDragOver] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCollection, setActiveCollection] = useState<string | null>(null)
  const [activeTier, setActiveTier] = useState<ContentTier | null>(null)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [activeSortLabel, setActiveSortLabel] = useState('Recently Chatted')

  const contentTypes: { id: LibraryContentType; label: string; count: number }[] = [
    { id: 'characters', label: 'Characters', count: libraryCharacters.length },
    { id: 'lorebooks', label: 'Lorebooks', count: lorebooks.length },
    { id: 'personas', label: 'Personas', count: personas.length },
  ]

  const filteredCharacters = libraryCharacters.filter((c) => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))) return false
    if (activeTier && c.contentTier !== activeTier) return false
    if (activeCollection && !c.collectionIds.includes(activeCollection)) return false
    return true
  })

  const densities: { id: GridDensity; icon: typeof LayoutGrid; label: string }[] = [
    { id: 'comfortable', icon: LayoutGrid, label: 'Comfortable' },
    { id: 'compact', icon: Grid3X3, label: 'Compact' },
    { id: 'list', icon: List, label: 'List' },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Content type tabs */}
      <div className="flex items-center gap-4 border-b border-zinc-800 px-6">
        {contentTypes.map((ct) => (
          <button
            key={ct.id}
            onClick={() => onChangeContentType?.(ct.id)}
            className={cn(
              'border-b-2 py-3 text-sm font-medium transition-colors',
              activeContentType === ct.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {ct.label}
            <span className="ml-1.5 text-[10px] tabular-nums text-zinc-600">{ct.count}</span>
          </button>
        ))}
      </div>

      {/* Characters view */}
      {activeContentType === 'characters' && (
        <div
          className={cn(
            'relative flex-1 overflow-y-auto transition-colors',
            charDragOver && 'ring-2 ring-inset ring-indigo-500/40'
          )}
          onDragOver={(e) => { e.preventDefault(); setCharDragOver(true) }}
          onDragLeave={() => setCharDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setCharDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file && (file.name.endsWith('.png') || file.name.endsWith('.json'))) {
              onImportCharacter?.(file)
            }
          }}
        >
          {charDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-indigo-500/5">
              <div className="rounded-xl border-2 border-dashed border-indigo-500/50 px-8 py-4 text-sm font-medium text-indigo-400">
                Drop to import character
              </div>
            </div>
          )}

          {/* Collection pills */}
          <div className="flex items-center gap-2 overflow-x-auto px-6 py-3 scrollbar-none">
            <button
              onClick={() => {
                setActiveCollection(null)
                onFilterCollection?.(null)
              }}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                !activeCollection
                  ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              )}
            >
              All ({libraryCharacters.length})
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  setActiveCollection(col.id)
                  onFilterCollection?.(col.id)
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  activeCollection === col.id
                    ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                )}
              >
                {col.name} ({col.memberCount})
              </button>
            ))}
            <button
              onClick={() => onCreateCollection?.('New Collection')}
              className="shrink-0 rounded-full bg-zinc-800/50 p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  onSearch?.(e.target.value)
                }}
                placeholder="Search characters..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
              {(['all', 'sfw', 'nsfw'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => {
                    const val = tier === 'all' ? null : tier
                    setActiveTier(val)
                    onFilterContentTier?.(val)
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    (tier === 'all' && !activeTier) || activeTier === tier
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {tier.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
              >
                {activeSortLabel}
                <ChevronDown className="h-3 w-3" />
              </button>
              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          onSort?.(opt.id)
                          setActiveSortLabel(opt.label)
                          setSortMenuOpen(false)
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-700"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5">
              {densities.map((d) => {
                const Icon = d.icon
                return (
                  <button
                    key={d.id}
                    onClick={() => onChangeGridDensity?.(d.id)}
                    className={cn(
                      'rounded-md p-1.5 transition-colors',
                      gridDensity === d.id
                        ? 'bg-zinc-700 text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                    title={d.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>

            <input
              ref={charFileInputRef}
              type="file"
              accept=".png,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportCharacter?.(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => charFileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-indigo-500/40 hover:text-zinc-200"
              title="Import character (.png or .json)"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
          </div>

          {/* Result count */}
          <div className="px-6 pb-2 text-[11px] text-zinc-600">
            {filteredCharacters.length} characters
            {activeCollection && ` in ${collections.find((c) => c.id === activeCollection)?.name}`}
          </div>

          {/* Grid / List */}
          {gridDensity === 'list' ? (
            <div className="px-2">
              {filteredCharacters.map((char) => (
                <LibraryCard
                  key={char.id}
                  character={char}
                  density="list"
                  onChat={() => onChat?.(char.id)}
                  onEdit={() => onEdit?.(char.id)}
                  onExport={(fmt) => onExport?.(char.id, fmt)}
                  onDuplicate={() => onDuplicate?.(char.id)}
                  onAddToCollection={() => onAddToCollection?.(char.id, '')}
                  onDelete={() => onDelete?.(char.id)}
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-3 px-6 pb-6',
                gridDensity === 'comfortable'
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
              )}
            >
              {filteredCharacters.map((char) => (
                <LibraryCard
                  key={char.id}
                  character={char}
                  density={gridDensity}
                  onChat={() => onChat?.(char.id)}
                  onEdit={() => onEdit?.(char.id)}
                  onExport={(fmt) => onExport?.(char.id, fmt)}
                  onDuplicate={() => onDuplicate?.(char.id)}
                  onAddToCollection={() => onAddToCollection?.(char.id, '')}
                  onDelete={() => onDelete?.(char.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lorebooks view */}
      {activeContentType === 'lorebooks' && (
        <div
          className={cn(
            'relative flex-1 overflow-y-auto p-6 transition-colors',
            lorebookDragOver && 'ring-2 ring-inset ring-indigo-500/40'
          )}
          onDragOver={(e) => { e.preventDefault(); setLorebookDragOver(true) }}
          onDragLeave={() => setLorebookDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setLorebookDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file && file.name.endsWith('.json')) {
              onImportLorebook?.(file)
            }
          }}
        >
          {lorebookDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-indigo-500/5">
              <div className="rounded-xl border-2 border-dashed border-indigo-500/50 px-8 py-4 text-sm font-medium text-indigo-400">
                Drop to import lorebook
              </div>
            </div>
          )}

          {/* Lorebooks toolbar */}
          <div className="mb-4 flex items-center justify-end gap-2">
            <input
              ref={lorebookFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportLorebook?.(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => lorebookFileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-indigo-500/40 hover:text-zinc-200"
            >
              <Upload className="h-3.5 w-3.5" />
              Import Lorebook
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {lorebooks.map((lb) => (
              <div
                key={lb.id}
                className="group cursor-pointer rounded-xl border border-zinc-800/50 bg-zinc-900 p-4 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
                onClick={() => onEditLorebook?.(lb.id)}
              >
                <div
                  className={cn(
                    'mb-3 flex h-12 w-12 items-center justify-center rounded-xl',
                    lb.coverColor === 'indigo' && 'bg-indigo-500/15 text-indigo-400',
                    lb.coverColor === 'teal' && 'bg-teal-500/15 text-teal-400',
                    lb.coverColor === 'amber' && 'bg-amber-500/15 text-amber-400',
                    lb.coverColor === 'rose' && 'bg-rose-500/15 text-rose-400',
                    lb.coverColor === 'zinc' && 'bg-zinc-700/50 text-zinc-400'
                  )}
                >
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="truncate text-sm font-medium text-zinc-200">{lb.name}</h3>
                <p className="mt-1 text-[11px] tabular-nums text-zinc-500">
                  {lb.entryCount} entries
                </p>
                {lb.attachedCharacterNames.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600">
                    <Link2 className="h-3 w-3" />
                    <span className="truncate">{lb.attachedCharacterNames.join(', ')}</span>
                  </div>
                )}
                {lb.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lb.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditLorebook?.(lb.id) }}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onExportLorebook?.(lb.id) }}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateLorebook?.(lb.id) }}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteLorebook?.(lb.id) }}
                    className="rounded p-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personas view */}
      {activeContentType === 'personas' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-end gap-2 px-0">
            <input
              ref={personaFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportPersona?.(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => personaFileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-indigo-500/40 hover:text-zinc-200"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <button
              onClick={onCreatePersona}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Persona
            </button>
          </div>
          <div
            className={cn(
              'grid gap-3',
              gridDensity === 'compact'
                ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
                : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            )}
          >
            {[...personas]
              .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0))
              .map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  isCompact={gridDensity === 'compact'}
                  onEdit={() => onEditPersona?.(persona.id)}
                  onSetDefault={() => onSetDefaultPersona?.(persona.id)}
                  onDuplicate={() => onDuplicatePersona?.(persona.id)}
                  onDelete={() => onDeletePersona?.(persona.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Persona Card (mirrors LibraryCard layout) ───────────────────────

interface PersonaCardProps {
  persona: { id: string; name: string; description: string; avatarUrl: string; isDefault: boolean; lastUsed: string }
  isCompact: boolean
  onEdit?: () => void
  onSetDefault?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

function PersonaCard({ persona, isCompact, onEdit, onSetDefault, onDuplicate, onDelete }: PersonaCardProps) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
      onClick={onEdit}
    >
      {/* Portrait area */}
      <div className={cn('relative overflow-hidden', 'aspect-[3/4]')}>
        {persona.avatarUrl ? (
          <img
            src={persona.avatarUrl}
            alt={persona.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-900/40 to-zinc-900/80">
            <span className={cn('font-bold text-zinc-500/60', isCompact ? 'text-4xl' : 'text-6xl')}>
              {persona.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Name + badge */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn('truncate font-semibold text-white', isCompact ? 'text-xs' : 'text-sm')}
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {persona.name}
              </h3>
              {persona.description && (
                <p className="mt-0.5 line-clamp-1 text-[9px] text-white/60">
                  {persona.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Default badge */}
        {persona.isDefault && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-indigo-500/80 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
            <Star className="h-3 w-3" fill="currentColor" />
            Default
          </div>
        )}

        {/* Hover overlay */}
        {hovered && (
          <div className="absolute inset-0 flex flex-col justify-between bg-black/60 p-3 backdrop-blur-[2px]">
            <div className="flex justify-end">
              <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
                Last used: {new Date(persona.lastUsed).toLocaleDateString()}
              </span>
            </div>
            <div>
              {persona.description && (
                <p className="mb-2 line-clamp-3 text-[10px] leading-relaxed text-zinc-400">
                  {persona.description}
                </p>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.() }}
                  className="flex-1 rounded-md bg-indigo-500 py-1.5 text-center text-[11px] font-medium text-white transition-colors hover:bg-indigo-400"
                >
                  Edit
                </button>
                {!persona.isDefault && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetDefault?.() }}
                    className="rounded-md bg-zinc-700/80 p-1.5 text-zinc-300 transition-colors hover:bg-zinc-600"
                    title="Set as default"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
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
