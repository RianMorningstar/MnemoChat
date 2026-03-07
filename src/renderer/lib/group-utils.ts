import type { ChatCharacter, ReplyStrategy } from '@shared/chat-types'

/**
 * Pick the next character to speak in a group chat based on the reply strategy.
 * The current speaker is always excluded from the pool.
 */
export function pickNextCharacter(
  characters: ChatCharacter[],
  currentId: string,
  strategy: ReplyStrategy,
): string {
  const others = characters.filter((c) => c.id !== currentId)
  if (others.length === 0) return currentId

  switch (strategy) {
    case 'round_robin': {
      const idx = characters.findIndex((c) => c.id === currentId)
      return characters[(idx + 1) % characters.length].id
    }
    case 'random': {
      // Use talkativeness as a probability gate, then pick uniformly
      const candidates = others.filter((c) => Math.random() < c.talkativeness)
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)].id
      }
      // Fallback to weighted pick if nobody passed the gate
      return weightedPick(others)
    }
    case 'weighted_random': {
      return weightedPick(others)
    }
  }
}

/** Weighted random selection by talkativeness. Falls back to uniform if all weights are 0. */
function weightedPick(candidates: ChatCharacter[]): string {
  const totalWeight = candidates.reduce((sum, c) => sum + c.talkativeness, 0)
  if (totalWeight === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)].id
  }
  let r = Math.random() * totalWeight
  for (const c of candidates) {
    r -= c.talkativeness
    if (r <= 0) return c.id
  }
  return candidates[candidates.length - 1].id
}
