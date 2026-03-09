import type { QuickReply } from '@shared/character-types'
import { useTranslation } from 'react-i18next'

interface QuickReplyPopoverProps {
  characterReplies: QuickReply[]
  globalReplies: QuickReply[]
  onSelect: (content: string) => void
  onClose: () => void
}

export function QuickReplyPopover({
  characterReplies,
  globalReplies,
  onSelect,
  onClose,
}: QuickReplyPopoverProps) {
  const { t } = useTranslation('chat')
  const hasCharacter = characterReplies.length > 0
  const hasGlobal = globalReplies.length > 0
  const empty = !hasCharacter && !hasGlobal

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-xl">
        {empty ? (
          <p className="text-center text-xs text-zinc-500">
            {t('quickReplies.empty')}
            <br />
            {t('quickReplies.emptyHint')}
          </p>
        ) : (
          <>
            {hasCharacter && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  {t('quickReplies.character')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {characterReplies.map((reply, i) => (
                    <button
                      key={`char-${i}`}
                      onClick={() => onSelect(reply.content)}
                      title={reply.content !== reply.label ? reply.content : undefined}
                      className="rounded-full bg-zinc-700/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-300"
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasCharacter && hasGlobal && (
              <div className="my-2 border-t border-zinc-700/50" />
            )}
            {hasGlobal && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  {t('quickReplies.global')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {globalReplies.map((reply, i) => (
                    <button
                      key={`global-${i}`}
                      onClick={() => onSelect(reply.content)}
                      title={reply.content !== reply.label ? reply.content : undefined}
                      className="rounded-full bg-zinc-700/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-300"
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
