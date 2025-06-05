import { useState } from 'react'
import { Plus, Search, ChevronDown, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  Project,
  ProjectStatus,
  StoryStructureProps,
} from '@shared/story-types'
import { ProjectCard } from './ProjectCard'

type ProjectListProps = Pick<
  StoryStructureProps,
  | 'projects'
  | 'projectStatuses'
  | 'onCreateProject'
  | 'onOpenProject'
  | 'onEditProject'
  | 'onDeleteProject'
  | 'onChangeProjectStatus'
  | 'onExport'
>

const statusFilterLabels: Record<string, string> = {
  all: 'All Projects',
  drafting: 'Drafting',
  'in-progress': 'In Progress',
  complete: 'Complete',
  archived: 'Archived',
}

type SortKey = 'updated' | 'created' | 'title' | 'words' | 'scenes'

const sortLabels: Record<SortKey, string> = {
  updated: 'Last Edited',
  created: 'Date Created',
  title: 'Title',
  words: 'Word Count',
  scenes: 'Scene Count',
}

function sortProjects(projects: Project[], sortBy: SortKey): Project[] {
  return [...projects].sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'words':
        return b.wordCount - a.wordCount
      case 'scenes':
        return b.sceneCount - a.sceneCount
    }
  })
}

export function ProjectList({
  projects,
  onCreateProject,
  onOpenProject,
  onEditProject,
  onDeleteProject,
  onChangeProjectStatus,
  onExport,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortKey>('updated')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  const filtered = projects.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !p.title.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q) &&
        !p.characterNames.some((n) => n.toLowerCase().includes(q))
      )
        return false
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    return true
  })

  const sorted = sortProjects(filtered, sortBy)

  const totalWords = projects.reduce((sum, p) => sum + p.wordCount, 0)
  const totalScenes = projects.reduce((sum, p) => sum + p.sceneCount, 0)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1
            className="text-lg font-bold text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Projects
          </h1>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
            {projects.length} projects &middot; {totalScenes} scenes &middot;{' '}
            {totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords} words
          </p>
        </div>
        <button
          onClick={onCreateProject}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, characters..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pl-10 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/50"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {statusFilterLabels[statusFilter]}
            <ChevronDown className="h-3 w-3" />
          </button>
          {statusMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {Object.entries(statusFilterLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setStatusFilter(key)
                      setStatusMenuOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-700',
                      statusFilter === key ? 'text-indigo-400' : 'text-zinc-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {sortLabels[sortBy]}
            <ChevronDown className="h-3 w-3" />
          </button>
          {sortMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
                {(Object.entries(sortLabels) as [SortKey, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortBy(key)
                      setSortMenuOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-700',
                      sortBy === key ? 'text-indigo-400' : 'text-zinc-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result count */}
      <div className="px-6 pb-2 text-[11px] text-zinc-600">
        {sorted.length} project{sorted.length !== 1 ? 's' : ''}
        {statusFilter !== 'all' && ` (${statusFilterLabels[statusFilter].toLowerCase()})`}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-zinc-700" />
            <p className="text-sm text-zinc-500">
              {searchQuery || statusFilter !== 'all'
                ? 'No projects match your filters.'
                : 'No projects yet.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={onCreateProject}
                className="mt-3 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => onOpenProject?.(project.id)}
                onEdit={() => onEditProject?.(project.id)}
                onDelete={() => onDeleteProject?.(project.id)}
                onExport={() => onExport?.(project.id, 'project')}
                onChangeStatus={(status) => onChangeProjectStatus?.(project.id, status)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
