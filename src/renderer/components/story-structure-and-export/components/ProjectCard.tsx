import { FileText, MoreHorizontal, Pencil, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus } from '@shared/story-types'

interface ProjectCardProps {
  project: Project
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onExport?: () => void
  onChangeStatus?: (status: ProjectStatus) => void
}

const statusConfig: Record<ProjectStatus, { label: string; color: string }> = {
  drafting: { label: 'Drafting', color: 'bg-zinc-700/60 text-zinc-400' },
  'in-progress': { label: 'In Progress', color: 'bg-indigo-500/15 text-indigo-400' },
  complete: { label: 'Complete', color: 'bg-teal-500/15 text-teal-400' },
  archived: { label: 'Archived', color: 'bg-zinc-700/40 text-zinc-500' },
}

function formatWordCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDelete,
  onExport,
}: ProjectCardProps) {
  const status = statusConfig[project.status]
  const initials = project.characterNames.slice(0, 4)

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900 transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
      onClick={onOpen}
    >
      {/* Cover area — character portrait collage or placeholder */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-zinc-800/80 to-zinc-900">
        {/* Character initial collage */}
        {initials.length > 0 ? (
          <div className="flex h-full w-full items-center justify-center">
            <div
              className={cn(
                'grid gap-0.5',
                initials.length === 1 && 'grid-cols-1',
                initials.length === 2 && 'grid-cols-2',
                initials.length >= 3 && 'grid-cols-2'
              )}
            >
              {initials.map((name, i) => {
                const colors = [
                  'from-indigo-900/70 to-indigo-950/90',
                  'from-teal-900/70 to-teal-950/90',
                  'from-violet-900/70 to-violet-950/90',
                  'from-rose-900/70 to-rose-950/90',
                ]
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-center bg-gradient-to-br',
                      colors[i % colors.length],
                      initials.length === 1 && 'h-full w-full',
                      initials.length === 2 && 'h-24 w-24',
                      initials.length >= 3 && 'h-16 w-16'
                    )}
                  >
                    <span
                      className={cn(
                        'font-bold text-zinc-400/60',
                        initials.length === 1 ? 'text-5xl' : initials.length === 2 ? 'text-3xl' : 'text-xl'
                      )}
                      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                    >
                      {name.charAt(0)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-10 w-10 text-zinc-700" />
          </div>
        )}

        {/* Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-900 to-transparent" />

        {/* Status badge */}
        <div className="absolute left-3 top-3">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm', status.color)}>
            {status.label}
          </span>
        </div>

        {/* Hover actions */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExport?.()
            }}
            className="rounded-lg bg-zinc-900/80 p-1.5 text-zinc-400 backdrop-blur-sm transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
            className="rounded-lg bg-zinc-900/80 p-1.5 text-zinc-400 backdrop-blur-sm transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.()
            }}
            className="rounded-lg bg-zinc-900/80 p-1.5 text-zinc-400 backdrop-blur-sm transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="truncate text-sm font-semibold text-zinc-100"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {project.title}
        </h3>

        {/* Stats row */}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-zinc-500">
          <span>{project.sceneCount} scenes</span>
          <span className="text-zinc-700">&middot;</span>
          <span>{formatWordCount(project.wordCount)}w</span>
        </div>

        {/* Last edited */}
        <p className="mt-1 text-[10px] text-zinc-600">
          Last edited {timeAgo(project.updatedAt)}
        </p>

        {/* Cast preview */}
        {project.characterNames.length > 0 && (
          <div className="mt-3 flex items-center gap-1">
            {project.characterNames.slice(0, 3).map((name, i) => (
              <div
                key={i}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-medium text-zinc-400 ring-1 ring-zinc-700/50"
                title={name}
              >
                {name.charAt(0)}
              </div>
            ))}
            {project.characterNames.length > 3 && (
              <span className="ml-0.5 text-[10px] text-zinc-600">
                +{project.characterNames.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
