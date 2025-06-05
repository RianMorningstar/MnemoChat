import { useState } from 'react'
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  Bookmark,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  MessageSquare,
  X,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  Scene,
  ContentBlock,
  Project,
  ExportScope,
  ExportFormat,
  ExportOptions,
  PdfStyle,
  StoryStructureProps,
} from '@shared/story-types'

type SceneEditorProps = Pick<
  StoryStructureProps,
  | 'exportFormats'
  | 'pdfStyleOptions'
  | 'onToggleBlockVisibility'
  | 'onReorderBlocks'
  | 'onViewBlockSource'
  | 'onAddBlock'
  | 'onOpenSourceChat'
  | 'onDeleteScene'
  | 'onExport'
  | 'onExecuteExport'
> & {
  scene: Scene
  contentBlocks: ContentBlock[]
  projectTitle: string
  onBack?: () => void
}

const sceneStatusConfig: Record<string, { label: string; color: string }> = {
  placeholder: { label: 'Placeholder', color: 'bg-zinc-700/40 text-zinc-500' },
  draft: { label: 'Draft', color: 'bg-amber-500/15 text-amber-400' },
  final: { label: 'Final', color: 'bg-teal-500/15 text-teal-400' },
}

function formatWordCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function renderProseText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="text-zinc-400">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('"') || part.includes('"')) {
      return <span key={i} className="text-zinc-200">{part}</span>
    }
    return <span key={i} className="text-zinc-300">{part}</span>
  })
}

const exportFormatLabels: Record<ExportFormat, string> = {
  'prose-md': 'Prose (Markdown)',
  'prose-txt': 'Prose (Plain Text)',
  json: 'JSON (Structured)',
  pdf: 'PDF (Formatted)',
}

export function SceneEditor({
  scene,
  contentBlocks,
  projectTitle,
  exportFormats,
  pdfStyleOptions,
  onBack,
  onToggleBlockVisibility,
  onReorderBlocks,
  onViewBlockSource,
  onAddBlock,
  onOpenSourceChat,
  onDeleteScene,
  onExport,
  onExecuteExport,
}: SceneEditorProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('prose-md')
  const [exportCharHeaders, setExportCharHeaders] = useState(false)
  const [exportPdfStyle, setExportPdfStyle] = useState<PdfStyle>('prose')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const orderedBlocks = [...contentBlocks].sort((a, b) => a.position - b.position)
  const visibleWordCount = orderedBlocks
    .filter((b) => !b.hidden)
    .reduce((sum, b) => sum + b.text.split(/\s+/).filter(Boolean).length, 0)
  const ss = sceneStatusConfig[scene.status] ?? sceneStatusConfig.draft

  function handleExport() {
    const options: ExportOptions = {
      format: exportFormat,
      scope: 'scene' as ExportScope,
      characterHeaders: exportCharHeaders,
      pdfStyle: exportPdfStyle,
    }
    onExecuteExport?.(scene.id, options)
    setExportModalOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="truncate">{projectTitle}</span>
            <span>/</span>
          </div>
          <h1
            className="truncate text-base font-bold text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {scene.title}
          </h1>
        </div>
        <button
          onClick={() => {
            setExportModalOpen(true)
            onExport?.(scene.id, 'scene')
          }}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <div className="relative">
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {moreMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                <button
                  onClick={() => {
                    onDeleteScene?.(scene.id)
                    setMoreMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400 hover:bg-zinc-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Scene
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Content blocks */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Block count bar */}
          <div className="flex items-center justify-between border-b border-zinc-800/50 px-6 py-2.5">
            <span className="text-xs text-zinc-500">
              {orderedBlocks.length} block{orderedBlocks.length !== 1 ? 's' : ''}{' '}
              <span className="text-zinc-700">&middot;</span>{' '}
              {orderedBlocks.filter((b) => b.hidden).length > 0 && (
                <span className="text-zinc-600">
                  {orderedBlocks.filter((b) => b.hidden).length} hidden
                </span>
              )}
            </span>
            <button
              onClick={() => onAddBlock?.(scene.id)}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              <Plus className="h-3 w-3" />
              Add Block
            </button>
          </div>

          {/* Blocks */}
          <div className="flex-1 space-y-3 p-6">
            {orderedBlocks.map((block, idx) => (
              <div
                key={block.id}
                className={cn(
                  'group rounded-xl border transition-all',
                  block.hidden
                    ? 'border-dashed border-zinc-800 bg-zinc-900/30'
                    : 'border-zinc-800/50 bg-zinc-900'
                )}
              >
                {/* Block header */}
                <div className="flex items-center gap-2 border-b border-zinc-800/30 px-4 py-2">
                  <Bookmark className={cn('h-3.5 w-3.5', block.hidden ? 'text-zinc-700' : 'text-indigo-500/70')} />
                  <span
                    className={cn(
                      'flex-1 truncate text-xs font-medium',
                      block.hidden ? 'text-zinc-600 line-through' : 'text-zinc-400'
                    )}
                  >
                    {block.bookmarkLabel}
                  </span>
                  <span className={cn('text-[10px]', block.hidden ? 'text-zinc-700' : 'text-zinc-600')}>
                    {block.speaker}
                  </span>
                </div>

                {/* Block content */}
                <div className={cn('px-4 py-3', block.hidden && 'opacity-40')}>
                  {block.hidden && (
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      <EyeOff className="h-3 w-3" />
                      Hidden from export
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {block.text.split('\n\n').map((para, pi) => (
                      <p key={pi} className={pi > 0 ? 'mt-3' : ''}>
                        {renderProseText(para)}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Block actions */}
                <div className="flex items-center gap-1 border-t border-zinc-800/30 px-3 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => onToggleBlockVisibility?.(block.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {block.hidden ? (
                      <>
                        <Eye className="h-3 w-3" /> Show
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Hide
                      </>
                    )}
                  </button>
                  {idx > 0 && (
                    <button
                      onClick={() => {
                        const newOrder = [...orderedBlocks]
                        ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
                        onReorderBlocks?.(scene.id, newOrder.map((b) => b.id))
                      }}
                      className="rounded px-1.5 py-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {idx < orderedBlocks.length - 1 && (
                    <button
                      onClick={() => {
                        const newOrder = [...orderedBlocks]
                        ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
                        onReorderBlocks?.(scene.id, newOrder.map((b) => b.id))
                      }}
                      className="rounded px-1.5 py-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onViewBlockSource?.(block.sourceMessageId)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    <ExternalLink className="h-3 w-3" /> View Source
                  </button>
                </div>
              </div>
            ))}

            {orderedBlocks.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <Bookmark className="mb-3 h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">No content blocks yet.</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Add blocks from bookmarked chat messages.
                </p>
                <button
                  onClick={() => onAddBlock?.(scene.id)}
                  className="mt-3 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  Add from bookmarks
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — Scene metadata */}
        <div className="w-72 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900/50 p-6 lg:w-80">
          {/* Title */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Title
            </label>
            <h2
              className="text-base font-bold text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {scene.title}
            </h2>
          </div>

          {/* Position */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Position in Project
            </label>
            <span className="text-sm tabular-nums text-zinc-300">
              Scene {scene.position}
            </span>
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Status
            </label>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', ss.color)}>
              {ss.label}
            </span>
          </div>

          {/* Source chat */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Source Chat
            </label>
            {scene.sourceChatTitle ? (
              <button
                onClick={() => scene.sourceChatId && onOpenSourceChat?.(scene.sourceChatId)}
                className="flex items-center gap-1.5 text-sm text-indigo-400 transition-colors hover:text-indigo-300"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {scene.sourceChatTitle}
              </button>
            ) : (
              <span className="text-xs italic text-zinc-600">None</span>
            )}
          </div>

          {/* Word count */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Word Count
            </label>
            <div className="text-sm tabular-nums text-zinc-300">
              {formatWordCount(scene.wordCount)}
              {orderedBlocks.some((b) => b.hidden) && (
                <span className="ml-1.5 text-[10px] text-zinc-600">
                  ({formatWordCount(visibleWordCount)} visible)
                </span>
              )}
            </div>
          </div>

          {/* Characters present */}
          <div className="mb-5">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Characters Present
            </label>
            {scene.charactersPresent.length === 0 ? (
              <span className="text-xs italic text-zinc-600">None detected</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {scene.charactersPresent.map((char) => (
                  <div
                    key={char.characterId}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2 py-1"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-400">
                      {char.name.charAt(0)}
                    </div>
                    <span className="text-xs text-zinc-300">{char.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scene notes */}
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Scene Notes
              <span className="ml-1.5 font-normal normal-case text-zinc-700">(never exported)</span>
            </label>
            {scene.sceneNotes ? (
              <div className="rounded-lg bg-zinc-800/60 p-3">
                <p className="text-xs leading-relaxed text-zinc-400">
                  {scene.sceneNotes}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-800 p-3">
                <p className="text-xs italic text-zinc-600">No notes yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setExportModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3
                className="text-base font-bold text-zinc-100"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Export Scene
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                Format
              </label>
              <div className="space-y-1.5">
                {(exportFormats ?? []).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={cn(
                      'flex w-full items-center rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                      exportFormat === fmt
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {exportFormatLabels[fmt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="mb-5 space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={exportCharHeaders}
                  onChange={(e) => setExportCharHeaders(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500/30"
                />
                Character name headers
              </label>
              {exportFormat === 'pdf' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">PDF style:</span>
                  {(pdfStyleOptions ?? []).map((style) => (
                    <button
                      key={style}
                      onClick={() => setExportPdfStyle(style)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        exportPdfStyle === style
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                      )}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleExport}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
