/** Branching utilities — DB-dependent functions separated from pure chat-utils. */

import { db } from "../../db";
import { messages, chats } from "../../db/schema";
import { eq, asc } from "drizzle-orm";
import type { BranchInfo, ForkPoint, BranchChild, BranchLeaf } from "../../../shared/chat-types";

export type MessageRow = typeof messages.$inferSelect;

/**
 * Lazily backfill parent_id chains on legacy chats that have no branching data.
 * Orders by timestamp and links each message to the previous one.
 * Sets activeLeafId on the chat to the last message.
 */
export function backfillParentIds(chatId: string): void {
  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
  if (!chat) return;

  // Only backfill if chat has never had an active leaf set
  if (chat.activeLeafId) return;

  const msgs = db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.timestamp))
    .all();

  if (msgs.length === 0) return;

  // Only backfill messages that have no parentId set
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i].parentId === null || msgs[i].parentId === undefined) {
      db.update(messages)
        .set({ parentId: msgs[i - 1].id, branchPosition: 0 })
        .where(eq(messages.id, msgs[i].id))
        .run();
    }
  }

  // Set active leaf to last message
  db.update(chats)
    .set({ activeLeafId: msgs[msgs.length - 1].id })
    .where(eq(chats.id, chatId))
    .run();
}

/**
 * Walk from a leaf message up to the root via parent_id chain.
 * Returns messages in root-to-leaf order (ready for display/context).
 */
export function getBranchPath(chatId: string, leafId?: string | null): MessageRow[] {
  const allMessages = db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .all();

  if (allMessages.length === 0) return [];

  const byId = new Map(allMessages.map((m) => [m.id, m]));

  // Find leaf
  let leaf: MessageRow | undefined;
  if (leafId) {
    leaf = byId.get(leafId);
  }
  if (!leaf) {
    // Legacy fallback: latest by timestamp
    leaf = [...allMessages].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    )[0];
  }
  if (!leaf) return [];

  // Walk parent chain to root
  const path: MessageRow[] = [];
  let current: MessageRow | undefined = leaf;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/**
 * Compute branch info for the active path: identifies fork points
 * (messages with multiple children) and sibling branch metadata.
 */
export function computeBranchInfo(chatId: string, activePath: MessageRow[]): BranchInfo {
  const allMessages = db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .all();

  const activeIds = new Set(activePath.map((m) => m.id));
  const leafId = activePath.length > 0 ? activePath[activePath.length - 1].id : "";

  // Group children by parent
  const childrenByParent = new Map<string, MessageRow[]>();
  for (const m of allMessages) {
    if (m.parentId) {
      const siblings = childrenByParent.get(m.parentId) || [];
      siblings.push(m);
      childrenByParent.set(m.parentId, siblings);
    }
  }

  // Also find messages with no parent (roots) — if multiple roots exist, they're siblings
  const roots = allMessages.filter((m) => !m.parentId);

  const forkPoints: ForkPoint[] = [];

  // Check if multiple roots (rare but possible after backfill edge cases)
  if (roots.length > 1) {
    const branches = roots
      .sort((a, b) => (a.branchPosition ?? 0) - (b.branchPosition ?? 0))
      .map((child): BranchChild => {
        const leafInfo = findDeepestLeaf(child.id, allMessages);
        return {
          branchPosition: child.branchPosition ?? 0,
          childId: child.id,
          isActive: activeIds.has(child.id),
          messageCount: leafInfo.depth,
          leafTimestamp: leafInfo.timestamp,
        };
      });
    const activeBranch = branches.find((b) => b.isActive);
    forkPoints.push({
      messageId: "__root__",
      activeBranchPosition: activeBranch?.branchPosition ?? 0,
      branches,
    });
  }

  // Find fork points: messages on the active path that have multiple children
  for (const msg of activePath) {
    const children = childrenByParent.get(msg.id);
    if (!children || children.length <= 1) continue;

    const branches = children
      .sort((a, b) => (a.branchPosition ?? 0) - (b.branchPosition ?? 0))
      .map((child): BranchChild => {
        const leafInfo = findDeepestLeaf(child.id, allMessages);
        return {
          branchPosition: child.branchPosition ?? 0,
          childId: child.id,
          isActive: activeIds.has(child.id),
          messageCount: leafInfo.depth,
          leafTimestamp: leafInfo.timestamp,
        };
      });

    const activeBranch = branches.find((b) => b.isActive);
    forkPoints.push({
      messageId: msg.id,
      activeBranchPosition: activeBranch?.branchPosition ?? 0,
      branches,
    });
  }

  return { leafId, forkPoints };
}

/** Find the deepest leaf reachable from a given message by always following branchPosition=0 children. */
function findDeepestLeaf(
  startId: string,
  allMessages: MessageRow[]
): { leafId: string; depth: number; timestamp: string } {
  const childrenByParent = new Map<string, MessageRow[]>();
  for (const m of allMessages) {
    if (m.parentId) {
      const siblings = childrenByParent.get(m.parentId) || [];
      siblings.push(m);
      childrenByParent.set(m.parentId, siblings);
    }
  }

  let current = startId;
  let depth = 1;
  let timestamp = allMessages.find((m) => m.id === startId)?.timestamp || "";

  while (true) {
    const children = childrenByParent.get(current);
    if (!children || children.length === 0) break;
    // Follow first child (lowest branchPosition)
    const next = children.sort((a, b) => (a.branchPosition ?? 0) - (b.branchPosition ?? 0))[0];
    current = next.id;
    timestamp = next.timestamp;
    depth++;
  }

  return { leafId: current, depth, timestamp };
}

/**
 * Recursively collect all descendant message IDs from a starting message.
 */
export function getDescendantIds(messageId: string, allMessages: MessageRow[]): string[] {
  const childrenByParent = new Map<string, MessageRow[]>();
  for (const m of allMessages) {
    if (m.parentId) {
      const siblings = childrenByParent.get(m.parentId) || [];
      siblings.push(m);
      childrenByParent.set(m.parentId, siblings);
    }
  }

  const result: string[] = [];
  const stack = [messageId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.push(id);
    const children = childrenByParent.get(id);
    if (children) {
      for (const child of children) {
        stack.push(child.id);
      }
    }
  }
  return result;
}

/**
 * Find all leaf messages (messages with no children) in a chat.
 * Returns metadata for each leaf for the branch panel.
 */
export function findAllLeaves(chatId: string): BranchLeaf[] {
  const allMessages = db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .all();

  if (allMessages.length === 0) return [];

  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
  const activeLeafId = chat?.activeLeafId;

  // Find which messages have children
  const hasChildren = new Set<string>();
  for (const m of allMessages) {
    if (m.parentId) hasChildren.add(m.parentId);
  }

  const byId = new Map(allMessages.map((m) => [m.id, m]));
  const leaves: BranchLeaf[] = [];

  for (const m of allMessages) {
    if (hasChildren.has(m.id)) continue; // not a leaf

    // Walk up to compute depth and find fork point
    let depth = 0;
    let forkMessageId = "";
    let current: MessageRow | undefined = m;
    while (current) {
      depth++;
      // Check if parent has multiple children (fork point)
      if (current.parentId) {
        const parentChildren = allMessages.filter((x) => x.parentId === current!.parentId);
        if (parentChildren.length > 1 && !forkMessageId) {
          forkMessageId = current.parentId;
        }
      }
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }

    leaves.push({
      leafId: m.id,
      leafTimestamp: m.timestamp,
      depth,
      lastContent: (m.content || "").slice(0, 100),
      isActive: m.id === activeLeafId,
      forkMessageId: forkMessageId || "",
    });
  }

  return leaves.sort((a, b) => b.leafTimestamp.localeCompare(a.leafTimestamp));
}
