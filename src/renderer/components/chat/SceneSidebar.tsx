import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Bookmark as BookmarkIcon,
  Sliders,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  Chat,
  TokenBudget,
  GenerationPreset,
  Bookmark,
  AvailableModel,
  SceneDirection,
  ReplyStrategy,
} from '@shared/chat-types'

interface SceneSidebarProps {
  chat: Chat
  tokenBudget: TokenBudget
  activePreset: GenerationPreset
  presets: GenerationPreset[]
  bookmarks: Bookmark[]
  availableModels?: AvailableModel[]
  sceneDirection?: SceneDirection
  onUpdatePreset?: (updates: Partial<GenerationPreset>) => void
  onSavePreset?: (name: string) => void
  onLoadPreset?: (presetId: string) => void
  onJumpToBookmark?: (messageId: string) => void
  onSwitchModel?: (modelId: string) => void
  onUpdateSceneDirection?: (text: string) => void
  onSetInjectionDepth?: (depth: number) => void
  onToggleSceneDirection?: (enabled: boolean) => void
  onReplyStrategyChange?: (strategy: ReplyStrategy) => void
  onAutoContinueChange?: (enabled: boolean) => void
  onTalkativenessChange?: (characterId: string, value: number) => void
}

export function SceneSidebar({
  chat,
  tokenBudget,
  activePreset,
  presets,
  bookmarks,
  availableModels,
  sceneDirection,
  onUpdatePreset,
  onSavePreset,
  onLoadPreset,
  onJumpToBookmark,
  onSwitchModel,
  onUpdateSceneDirection,
  onSetInjectionDepth,
  onToggleSceneDirection,
  onReplyStrategyChange,
  onAutoContinueChange,
  onTalkativenessChange,
}: SceneSidebarProps) {
  const [genOpen, setGenOpen] = useState(false)
  const [budgetExpanded, setBudgetExpanded] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'info' | 'bookmarks'>('info')

  const usedTokens = tokenBudget.contextMax - tokenBudget.available
  const usagePercent = (usedTokens / tokenBudget.contextMax) * 100

  return (
    <div className="flex h-full w-72 flex-col border-l border-zinc-800 bg-zinc-900/50">
      {/* Tab switcher */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setSidebarTab('info')}
          className={cn(
            'flex-1 py-2.5 text-center text-xs font-medium transition-colors',
            sidebarTab === 'info'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Scene
        </button>
        <button
          onClick={() => setSidebarTab('bookmarks')}
          className={cn(
            'flex-1 py-2.5 text-center text-xs font-medium transition-colors',
            sidebarTab === 'bookmarks'
              ? 'border-b-2 border-indigo-500 text-indigo-400'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Outline ({bookmarks.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'info' && (
          <div className="space-y-0">
            {/* Character info */}
            <div className="border-b border-zinc-800 p-4">
              {chat.characterPortraitUrl ? (
                <img
                  src={chat.characterPortraitUrl}
                  alt={chat.characterName}
                  className="mx-auto max-h-48 rounded-2xl object-contain ring-1 ring-zinc-700/50"
                />
              ) : (
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-700/40 to-zinc-800/60 ring-1 ring-zinc-700/50">
                  <span className="text-4xl font-bold text-zinc-500">
                    {chat.characterName.charAt(0)}
                  </span>
                </div>
              )}
              <h3
                className="mt-3 text-center text-sm font-semibold text-zinc-200"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {chat.characterName}
              </h3>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {chat.characterTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    {tag.replace(/[_-]/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Model selector */}
            {availableModels && availableModels.length > 0 && (
              <div className="border-b border-zinc-800 p-4">
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Model
                </label>
                <select
                  value={chat.modelId}
                  onChange={(e) => onSwitchModel?.(e.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Scene direction */}
            {sceneDirection && (
              <div className="border-b border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Author's Note
                  </span>
                  <button
                    onClick={() => onToggleSceneDirection?.(!sceneDirection.enabled)}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] font-medium',
                      sceneDirection.enabled
                        ? 'bg-indigo-500/15 text-indigo-400'
                        : 'bg-zinc-800 text-zinc-600'
                    )}
                  >
                    {sceneDirection.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {sceneDirection.enabled && (
                  <div className="space-y-2">
                    <textarea
                      value={sceneDirection.text}
                      onChange={(e) => onUpdateSceneDirection?.(e.target.value)}
                      placeholder="Guide the scene direction..."
                      rows={3}
                      className="w-full resize-none rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-500">Injection depth</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={sceneDirection.injectionDepth}
                        onChange={(e) => onSetInjectionDepth?.(Number(e.target.value))}
                        className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-right text-[10px] tabular-nums text-zinc-300 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Group chat settings */}
            {chat.characters && chat.characters.length > 1 && (
              <div className="border-b border-zinc-800 p-4">
                <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Group Settings
                </span>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] text-zinc-500">Reply Strategy</label>
                    <select
                      value={chat.replyStrategy ?? 'round_robin'}
                      onChange={(e) => onReplyStrategyChange?.(e.target.value as ReplyStrategy)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 outline-none"
                    >
                      <option value="round_robin">Round Robin</option>
                      <option value="random">Random</option>
                      <option value="weighted_random">Weighted Random</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500">Auto-continue</label>
                    <button
                      onClick={() => onAutoContinueChange?.(!chat.autoContinue)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[9px] font-medium',
                        chat.autoContinue
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-zinc-800 text-zinc-600'
                      )}
                    >
                      {chat.autoContinue ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {chat.characters.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <span className="w-20 truncate text-[10px] text-zinc-400">{c.name}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={c.talkativeness ?? 0.5}
                        onChange={(e) => onTalkativenessChange?.(c.id, Number(e.target.value))}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="w-8 text-right text-[10px] tabular-nums text-zinc-500">
                        {((c.talkativeness ?? 0.5) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Token budget meter */}
            <div className="border-b border-zinc-800 p-4">
              <button
                onClick={() => setBudgetExpanded(!budgetExpanded)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Context
                </span>
                <span className="ml-auto text-[10px] tabular-nums text-zinc-400">
                  {usedTokens.toLocaleString()} / {tokenBudget.contextMax.toLocaleString()}
                </span>
              </button>

              {/* Bar */}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    usagePercent > 85
                      ? 'bg-gradient-to-r from-amber-500 to-red-500'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              {/* Breakdown */}
              {budgetExpanded && (
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: 'System prompt', value: tokenBudget.systemPrompt },
                    { label: 'Character card', value: tokenBudget.characterCard },
                    {
                      label: 'Chat history',
                      value: tokenBudget.chatHistory,
                      note: tokenBudget.scrollingOutSoon ? 'scrolling out soon' : undefined,
                    },
                    {
                      label: 'Scene direction',
                      value: tokenBudget.sceneDirection,
                      note: tokenBudget.sceneDirection > 0 ? 'active' : undefined,
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">
                        {item.label}
                        {item.note && (
                          <span className="ml-1 text-amber-500/80">({item.note})</span>
                        )}
                      </span>
                      <span className="tabular-nums text-zinc-400">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 text-[10px]">
                    <span className="font-medium text-teal-400">Available</span>
                    <span className="tabular-nums text-teal-400">
                      {tokenBudget.available.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Generation controls drawer */}
            <div className="border-b border-zinc-800">
              <button
                onClick={() => setGenOpen(!genOpen)}
                className="flex w-full items-center gap-2 p-4 text-left"
              >
                <Sliders className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">Generation</span>
                <span className="ml-auto text-[10px] text-zinc-600">{activePreset.name}</span>
                {genOpen ? (
                  <ChevronDown className="h-3 w-3 text-zinc-600" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                )}
              </button>

              {genOpen && (
                <div className="space-y-3 px-4 pb-4">
                  {/* Preset selector */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">
                      Preset
                    </label>
                    <select
                      value={activePreset.id}
                      onChange={(e) => onLoadPreset?.(e.target.value)}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 outline-none"
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Temperature
                      </label>
                      <span className="text-[10px] tabular-nums text-zinc-400">
                        {activePreset.temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={activePreset.temperature}
                      onChange={(e) =>
                        onUpdatePreset?.({ temperature: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-indigo-500"
                    />
                  </div>

                  {/* Repetition Penalty */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Rep. Penalty
                      </label>
                      <span className="text-[10px] tabular-nums text-zinc-400">
                        {activePreset.repetitionPenalty.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={2}
                      step={0.05}
                      value={activePreset.repetitionPenalty}
                      onChange={(e) =>
                        onUpdatePreset?.({ repetitionPenalty: Number(e.target.value) })
                      }
                      className="mt-1 w-full accent-indigo-500"
                    />
                  </div>

                  {/* Top-P */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
                        Top-P
                        <button
                          onClick={() =>
                            onUpdatePreset?.({ topPEnabled: !activePreset.topPEnabled })
                          }
                          className={cn(
                            'rounded px-1 py-0.5 text-[9px] font-medium',
                            activePreset.topPEnabled
                              ? 'bg-indigo-500/15 text-indigo-400'
                              : 'bg-zinc-800 text-zinc-600'
                          )}
                        >
                          {activePreset.topPEnabled ? 'ON' : 'OFF'}
                        </button>
                      </label>
                      <span className="text-[10px] tabular-nums text-zinc-400">
                        {activePreset.topP.toFixed(2)}
                      </span>
                    </div>
                    {activePreset.topPEnabled && (
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={activePreset.topP}
                        onChange={(e) =>
                          onUpdatePreset?.({ topP: Number(e.target.value) })
                        }
                        className="mt-1 w-full accent-indigo-500"
                      />
                    )}
                  </div>

                  {/* Top-K */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
                        Top-K
                        <button
                          onClick={() =>
                            onUpdatePreset?.({ topKEnabled: !activePreset.topKEnabled })
                          }
                          className={cn(
                            'rounded px-1 py-0.5 text-[9px] font-medium',
                            activePreset.topKEnabled
                              ? 'bg-indigo-500/15 text-indigo-400'
                              : 'bg-zinc-800 text-zinc-600'
                          )}
                        >
                          {activePreset.topKEnabled ? 'ON' : 'OFF'}
                        </button>
                      </label>
                      <span className="text-[10px] tabular-nums text-zinc-400">
                        {activePreset.topK}
                      </span>
                    </div>
                    {activePreset.topKEnabled && (
                      <input
                        type="range"
                        min={1}
                        max={100}
                        step={1}
                        value={activePreset.topK}
                        onChange={(e) =>
                          onUpdatePreset?.({ topK: Number(e.target.value) })
                        }
                        className="mt-1 w-full accent-indigo-500"
                      />
                    )}
                  </div>

                  {/* Max New Tokens */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">
                      Max New Tokens
                    </label>
                    <input
                      type="number"
                      value={activePreset.maxNewTokens}
                      onChange={(e) =>
                        onUpdatePreset?.({ maxNewTokens: Number(e.target.value) })
                      }
                      min={64}
                      max={4096}
                      step={64}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs tabular-nums text-zinc-300 outline-none"
                    />
                  </div>

                  {/* Stop Sequences */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">
                      Stop Sequences
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {activePreset.stopSequences.map((seq, i) => (
                        <span
                          key={i}
                          className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                        >
                          {seq.replace(/\n/g, '\\n')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Negative Prompt */}
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">
                      Negative Prompt
                    </label>
                    <textarea
                      value={activePreset.negativePrompt}
                      onChange={(e) =>
                        onUpdatePreset?.({ negativePrompt: e.target.value })
                      }
                      placeholder="Describe what to avoid..."
                      rows={2}
                      className="w-full resize-none rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* CFG Scale (future use) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-zinc-600">
                        CFG Scale
                      </label>
                      <span className="text-[10px] text-zinc-600">Future use</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={activePreset.guidanceScale}
                        onChange={(e) =>
                          onUpdatePreset?.({ guidanceScale: Number(e.target.value) })
                        }
                        className="mt-1 w-full accent-indigo-500"
                      />
                      <span className="text-[10px] tabular-nums text-zinc-400">
                        {activePreset.guidanceScale.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Save as Preset */}
                  <button
                    onClick={() => onSavePreset?.('New Preset')}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                  >
                    <Save className="h-3 w-3" />
                    Save as Preset
                  </button>
                </div>
              )}
            </div>

            {/* Chat stats */}
            <div className="p-4">
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Messages</span>
                  <span className="tabular-nums text-zinc-400">{chat.messageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Words</span>
                  <span className="tabular-nums text-zinc-400">{chat.wordCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Bookmarks</span>
                  <span className="tabular-nums text-zinc-400">{chat.bookmarkCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookmarks / Scene Outline */}
        {sidebarTab === 'bookmarks' && (
          <div className="p-3">
            <h3 className="mb-3 px-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Scene Outline
            </h3>
            {bookmarks.length === 0 ? (
              <p className="px-1 text-xs text-zinc-600">
                Bookmark messages to build a scene outline.
              </p>
            ) : (
              <div className="space-y-1">
                {bookmarks.map((bm) => (
                  <button
                    key={bm.id}
                    onClick={() => onJumpToBookmark?.(bm.messageId)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-800"
                  >
                    <BookmarkIcon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        bm.color === 'indigo' && 'text-indigo-400',
                        bm.color === 'teal' && 'text-teal-400',
                        bm.color === 'amber' && 'text-amber-400',
                        bm.color === 'rose' && 'text-rose-400',
                        bm.color === 'zinc' && 'text-zinc-400'
                      )}
                      fill="currentColor"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-zinc-300">
                        {bm.label || 'Untitled bookmark'}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        msg {bm.messageIndex + 1}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
