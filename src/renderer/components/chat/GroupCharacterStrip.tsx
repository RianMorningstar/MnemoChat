import { cn } from '@/lib/utils'
import type { ChatCharacter } from '@shared/chat-types'

interface GroupCharacterStripProps {
  characters: ChatCharacter[]
  pendingCharacterId: string
  isGenerating: boolean
  onSelectCharacter: (characterId: string) => void
}

export function GroupCharacterStrip({
  characters,
  pendingCharacterId,
  isGenerating,
  onSelectCharacter,
}: GroupCharacterStripProps) {
  return (
    <div className="flex items-center gap-1.5 border-t border-zinc-800/60 px-4 py-2">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        Speaks next
      </span>
      <div className="flex flex-wrap gap-1.5">
        {characters.map((char) => {
          const isSelected = char.id === pendingCharacterId
          return (
            <button
              key={char.id}
              onClick={() => !isGenerating && onSelectCharacter(char.id)}
              disabled={isGenerating}
              title={char.name}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                isSelected
                  ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/40'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
                isGenerating && 'cursor-not-allowed opacity-50'
              )}
            >
              {char.portraitUrl ? (
                <img
                  src={char.portraitUrl}
                  alt={char.name}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <div className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
                  isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-zinc-700 text-zinc-400'
                )}>
                  {char.name.charAt(0)}
                </div>
              )}
              <span className="max-w-[80px] truncate">{char.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
