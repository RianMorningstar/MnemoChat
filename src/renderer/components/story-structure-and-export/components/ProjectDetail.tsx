import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Download,
  Plus,
  GripVertical,
  MessageSquare,
  Pencil,
  Trash2,
  BookOpen,
  X,
  ChevronDown,
  FileText,
  Bookmark,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  Project,
  Scene,
  ProjectStatus,
  ExportScope,
  ExportFormat,
  ExportOptions,
  PdfStyle,
  StoryStructureProps,
} from '@shared/story-types'

type ProjectDetailProps = Pick<
  StoryStructureProps,
  | 'exportFormats'
  | 'exportScopes'
  | 'pdfStyleOptions'
  | 'projectStatuses'
  | 'onEditProject'
  | 'onDeleteProject'
  | 'onChangeProjectStatus'
  | 'onAddCharacter'
  | 'onRemoveCharacter'
  | 'onAddLorebook'
  | 'onRemoveLorebook'
  | 'onCreateSceneFromBookmarks'
  | 'onCreatePlaceholderScene'
  | 'onOpenScene'
  | 'onReorderScenes'
  | 'onDeleteScene'
  | 'onOpenSourceChat'
  | 'onExport'
  | 'onExecuteExport'
> & {
  project: Project
  scenes: Scene[]
  onBack?: () => void
  onUpdateCoverImage?: (projectId: string, dataUrl: string | null) => void
}

function formatWordCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function ProjectDetail({
  project,
  scenes,
  exportFormats,
  pdfStyleOptions,
  projectStatuses,
  onBack,
  onEditProject,
  onChangeProjectStatus,
  onAddCharacter,
  onRemoveCharacter,
  onAddLorebook,
  onRemoveLorebook,
  onCreateSceneFromBookmarks,
  onCreatePlaceholderScene,
  onOpenScene,
  onDeleteScene,
  onOpenSourceChat,
  onExport,
  onExecuteExport,
  onUpdateCoverImage,
}: ProjectDetailProps) {
  const { t } = useTranslation('story')

  const statusConfig: Record<ProjectStatus, { label: string; color: string }> = {
    drafting: { label: t('status.drafting'), color: 'bg-zinc-700/60 text-zinc-400' },
    'in-progress': { label: t('status.inProgress'), color: 'bg-indigo-500/15 text-indigo-400' },
    complete: { label: t('status.complete'), color: 'bg-teal-500/15 text-teal-400' },
    archived: { label: t('status.archived'), color: 'bg-zinc-700/40 text-zinc-500' },
  }

  const sceneStatusConfig: Record<string, { label: string; color: string }> = {
    placeholder: { label: t('scene.placeholder'), color: 'text-zinc-600' },
    draft: { label: t('scene.draft'), color: 'text-amber-500/70' },
    final: { label: t('scene.final'), color: 'text-teal-500/70' },
  }

  const exportFormatLabels: Record<ExportFormat, string> = {
    'prose-md': t('export.proseMd'),
    'prose-txt': t('export.proseTxt'),
    json: t('export.json'),
    pdf: t('export.pdf'),
  }

  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUpdateCoverImage?.(project.id, reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const [addSceneMenuOpen, setAddSceneMenuOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportTargetId, setExportTargetId] = useState<string | null>(null)
  const [exportScope, setExportScope] = useState<ExportScope>('project')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('prose-md')
  const [exportCharHeaders, setExportCharHeaders] = useState(false)
  const [exportPdfStyle, setExportPdfStyle] = useState<PdfStyle>('prose')

  const orderedScenes = [...scenes].sort((a, b) => a.position - b.position)
  const status = statusConfig[project.status]

  function openExportModal(targetId: string, scope: ExportScope) {
    setExportTargetId(targetId)
    setExportScope(scope)
    setExportModalOpen(true)
    onExport?.(targetId, scope)
  }

  function handleExecuteExport() {
    if (!exportTargetId) return
    const options: ExportOptions = {
      format: exportFormat,
      scope: exportScope,
      characterHeaders: exportCharHeaders,
      pdfStyle: exportPdfStyle,
    }
    onExecuteExport?.(exportTargetId, options)
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
          <h1
            className="truncate text-base font-bold text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {project.title}
          </h1>
        </div>
        <button
          onClick={() => openExportModal(project.id, 'project')}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
        >
          <Download className="h-3.5 w-3.5" />
          {t('detail.exportProject')}
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Scene list */}
        <div className="flex flex-1 flex-col overflow-y-auto border-r border-zinc-800">
          {/* Scene list header */}
          <div className="flex items-center justify-between px-6 py-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              {t('detail.scenesCount', { count: orderedScenes.length })}
            </h2>
            <div className="relative">
              <button
                onClick={() => setAddSceneMenuOpen(!addSceneMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                <Plus className="h-3 w-3" />
                {t('detail.addScene')}
              </button>
              {addSceneMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAddSceneMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                    <button
                      onClick={() => {
                        onCreateSceneFromBookmarks?.(project.id)
                        setAddSceneMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-700"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-indigo-400" />
                      <div>
                        <div className="font-medium">{t('detail.fromBookmarks')}</div>
                        <div className="mt-0.5 text-[10px] text-zinc-500">{t('detail.fromBookmarksDesc')}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        onCreatePlaceholderScene?.(project.id)
                        setAddSceneMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-700"
                    >
                      <FileText className="h-3.5 w-3.5 text-zinc-500" />
                      <div>
                        <div className="font-medium">{t('detail.placeholder')}</div>
                        <div className="mt-0.5 text-[10px] text-zinc-500">{t('detail.placeholderDesc')}</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Scene rows */}
          <div className="flex-1 px-3 pb-6">
            {orderedScenes.map((scene) => {
              const ss = sceneStatusConfig[scene.status] ?? sceneStatusConfig.draft
              const isPlaceholder = scene.status === 'placeholder'
              return (
                <div
                  key={scene.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors',
                    isPlaceholder
                      ? 'border border-dashed border-zinc-800 bg-transparent'
                      : 'cursor-pointer hover:bg-zinc-800/50'
                  )}
                  onClick={() => !isPlaceholder && onOpenScene?.(scene.id)}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Position number */}
                  <span className="w-6 text-center text-xs tabular-nums font-medium text-zinc-600">
                    {String(scene.position).padStart(2, '0')}
                  </span>

                  {/* Scene info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          isPlaceholder ? 'italic text-zinc-600' : 'text-zinc-200'
                        )}
                        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                      >
                        {scene.title}
                      </span>
                      <span className={cn('shrink-0 text-[9px] font-medium uppercase', ss.color)}>
                        {ss.label}
                      </span>
                    </div>
                    {scene.sourceChatTitle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (scene.sourceChatId) onOpenSourceChat?.(scene.sourceChatId)
                        }}
                        className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600 transition-colors hover:text-indigo-400"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {scene.sourceChatTitle}
                      </button>
                    )}
                    {isPlaceholder && !scene.sourceChatTitle && (
                      <p className="mt-0.5 text-[10px] italic text-zinc-700">{t('detail.noContentYet')}</p>
                    )}
                  </div>

                  {/* Word count */}
                  <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                    {scene.wordCount > 0 ? `${formatWordCount(scene.wordCount)}w` : '—'}
                  </span>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isPlaceholder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openExportModal(scene.id, 'scene')
                        }}
                        className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                        title={t('detail.exportScene')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteScene?.(scene.id)
                      }}
                      className="rounded p-1 text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                      title={t('detail.deleteScene')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}

            {orderedScenes.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <FileText className="mb-3 h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">{t('detail.noScenes')}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {t('detail.noScenesHint')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Metadata panel */}
        <div className="w-80 shrink-0 overflow-y-auto bg-zinc-900/50 p-6 lg:w-96">
          {/* Cover Image */}
          <div className="mb-6">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {t('detail.coverImage')}
              </label>
              {project.coverImage && (
                <button
                  onClick={() => onUpdateCoverImage?.(project.id, null)}
                  className="text-[10px] text-zinc-600 transition-colors hover:text-red-400"
                >
                  {t('detail.removeCover')}
                </button>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFileChange}
            />
            {project.coverImage ? (
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={project.coverImage}
                  alt="Cover"
                  className="h-32 w-full object-cover"
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                >
                  <span className="text-xs font-medium text-white">{t('detail.changeCover')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-400"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs">{t('detail.uploadCover')}</span>
              </button>
            )}
          </div>

          {/* Title & Description */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              {t('detail.titleLabel')}
            </label>
            <h2
              className="text-lg font-bold text-zinc-100"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {project.title}
            </h2>
            {project.description && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {project.description}
              </p>
            )}
            <button
              onClick={() => onEditProject?.(project.id)}
              className="mt-2 flex items-center gap-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300"
            >
              <Pencil className="h-3 w-3" />
              {t('detail.edit')}
            </button>
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              {t('detail.statusLabel')}
            </label>
            <div className="relative">
              <button
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm transition-colors hover:border-zinc-600"
              >
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', status.color)}>
                  {status.label}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-500" />
              </button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                    {(projectStatuses ?? []).map((s) => {
                      const cfg = statusConfig[s]
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            onChangeProjectStatus?.(project.id, s)
                            setStatusMenuOpen(false)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-700"
                        >
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', cfg.color)}>
                            {cfg.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cast */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {t('detail.cast')}
              </label>
              <button
                onClick={() => onAddCharacter?.(project.id)}
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {project.characterNames.length === 0 ? (
              <p className="text-xs italic text-zinc-600">{t('detail.noCharacters')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.characterNames.map((name, i) => (
                  <div
                    key={i}
                    className="group/char flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-400">
                      {name.charAt(0)}
                    </div>
                    <span className="text-xs text-zinc-300">{name}</span>
                    <button
                      onClick={() => onRemoveCharacter?.(project.id, project.characterIds[i])}
                      className="ml-0.5 hidden rounded text-zinc-600 transition-colors hover:text-red-400 group-hover/char:block"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lorebooks */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {t('detail.lorebooks')}
              </label>
              <button
                onClick={() => onAddLorebook?.(project.id)}
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {project.lorebookNames.length === 0 ? (
              <p className="text-xs italic text-zinc-600">{t('detail.noLorebooks')}</p>
            ) : (
              <div className="space-y-1.5">
                {project.lorebookNames.map((name, i) => (
                  <div
                    key={i}
                    className="group/lb flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-teal-500/70" />
                    <span className="flex-1 truncate text-xs text-zinc-300">{name}</span>
                    <button
                      onClick={() => onRemoveLorebook?.(project.id, project.lorebookIds[i])}
                      className="hidden rounded text-zinc-600 transition-colors hover:text-red-400 group-hover/lb:block"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              {t('detail.statsLabel')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-zinc-800/60 p-3">
                <p className="text-lg font-bold tabular-nums text-zinc-200">
                  {formatWordCount(project.wordCount)}
                </p>
                <p className="text-[10px] text-zinc-500">{t('detail.statWords')}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 p-3">
                <p className="text-lg font-bold tabular-nums text-zinc-200">
                  {project.sceneCount}
                </p>
                <p className="text-[10px] text-zinc-500">{t('detail.statScenes')}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 p-3">
                <p className="text-lg font-bold tabular-nums text-zinc-200">
                  {project.characterNames.length}
                </p>
                <p className="text-[10px] text-zinc-500">{t('detail.statCharacters')}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/60 p-3">
                <p className="text-lg font-bold tabular-nums text-zinc-200">
                  {scenes.filter((s) => s.sourceChatId).length}
                </p>
                <p className="text-[10px] text-zinc-500">{t('detail.statChatSessions')}</p>
              </div>
            </div>
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
                {t('export.title')}
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scope */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {t('export.scope')}
              </label>
              <div className="flex gap-2">
                {(['scene', 'project'] as ExportScope[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setExportScope(s)}
                    className={cn(
                      'flex-1 rounded-lg border py-2 text-xs font-medium transition-colors',
                      exportScope === s
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {s === 'scene' ? t('export.thisScene') : t('export.allScenes')}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {t('export.format')}
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
                {t('export.charHeaders')}
              </label>
              {exportFormat === 'pdf' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{t('export.pdfStyle')}</span>
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

            {/* Export button */}
            <button
              onClick={handleExecuteExport}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
            >
              <Download className="h-4 w-4" />
              {t('export.button')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
