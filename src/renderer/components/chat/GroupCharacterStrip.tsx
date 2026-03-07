import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { ChatCharacter, ReplyStrategy } from '@shared/chat-types'

interface GroupCharacterStripProps {
  characters: ChatCharacter[]
  pendingCharacterId: string
  isGenerating: boolean
  replyStrategy: ReplyStrategy
  onSelectCharacter: (characterId: string) => void
  onTalkativenessChange?: (characterId: string, value: number) => void
  onReplyStrategyChange?: (strategy: ReplyStrategy) => void
  autoContinue: boolean
  onAutoContinueChange?: (enabled: boolean) => void
}

const STRATEGY_LABELS: Record<ReplyStrategy, string> = {
  round_robin: 'Round Robin',
  random: 'Random',
  weighted_random: 'Weighted Random',
}

export function GroupCharacterStrip({
  characters,
  pendingCharacterId,
  isGenerating,
  replyStrategy,
  onSelectCharacter,
  onTalkativenessChange,
  onReplyStrategyChange,
  autoContinue,
  onAutoContinueChange,
}: GroupCharacterStripProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const handleTalkativenessChange = useCallback((characterId: string, value: number) => {
    // Debounce API calls while dragging
    const existing = debounceTimers.current.get(characterId)
    if (existing) clearTimeout(existing)
    debounceTimers.current.set(characterId, setTimeout(() => {
      onTalkativenessChange?.(characterId, value)
      debounceTimers.current.delete(characterId)
    }, 300))
  }, [onTalkativenessChange])

  return (
    <div className="border-t border-zinc-800/60">
      <div className="flex items-center gap-1.5 px-4 py-2">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Speaks next
        </span>
        {autoContinue && (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30 animate-pulse">
            Auto
          </span>
        )}
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

        {/* Settings toggle */}
        <button
          onClick={() => setSettingsOpen((prev) => !prev)}
          title="Group chat settings"
          className={cn(
            'ml-auto shrink-0 rounded p-1.5 transition-colors',
            settingsOpen
              ? 'bg-zinc-700 text-zinc-200'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="border-t border-zinc-800/40 px-4 py-3 space-y-3">
          {/* Reply strategy selector */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 shrink-0">
              Strategy
            </span>
            <div className="flex gap-1">
              {(Object.keys(STRATEGY_LABELS) as ReplyStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onReplyStrategyChange?.(s)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    replyStrategy === s
                      ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/40'
                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                  )}
                >
                  {STRATEGY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-continue toggle */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 shrink-0">
              Auto-Continue
            </span>
            <button
              onClick={() => onAutoContinueChange?.(!autoContinue)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                autoContinue ? 'bg-emerald-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                  autoContinue ? 'translate-x-[18px]' : 'translate-x-[3px]'
                )}
              />
            </button>
            <span className="text-[11px] text-zinc-500">
              Characters respond automatically
            </span>
          </div>

          {/* Talkativeness sliders — only shown for non-round-robin strategies */}
          {replyStrategy !== 'round_robin' && (
            <div className="space-y-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                Talkativeness
              </span>
              {characters.map((char) => (
                <TalkativenessSlider
                  key={char.id}
                  character={char}
                  onChange={handleTalkativenessChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TalkativenessSlider({
  character,
  onChange,
}: {
  character: ChatCharacter
  onChange: (characterId: string, value: number) => void
}) {
  const [localValue, setLocalValue] = useState(character.talkativeness)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setLocalValue(v)
    onChange(character.id, v)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-24 items-center gap-1.5 shrink-0">
        {character.portraitUrl ? (
          <img src={character.portraitUrl} alt={character.name} className="h-4 w-4 rounded-full object-cover" />
        ) : (
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-400">
            {character.name.charAt(0)}
          </div>
        )}
        <span className="text-xs text-zinc-400 truncate">{character.name}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={localValue}
        onChange={handleChange}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400"
      />
      <span className="w-9 text-right text-[11px] tabular-nums text-zinc-500">
        {Math.round(localValue * 100)}%
      </span>
    </div>
  )
}
