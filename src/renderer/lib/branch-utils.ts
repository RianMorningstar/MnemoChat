import type { BranchInfo } from "@shared/types";

/**
 * Given a fork point's child message ID and a direction,
 * find the leaf ID of the adjacent sibling branch.
 */
export function getSiblingLeafId(
  branchInfo: BranchInfo,
  childMessageId: string,
  direction: "prev" | "next"
): string | null {
  for (const fp of branchInfo.forkPoints) {
    const branchIdx = fp.branches.findIndex((b) => b.childId === childMessageId);
    if (branchIdx === -1) continue;

    const targetIdx = direction === "prev" ? branchIdx - 1 : branchIdx + 1;
    if (targetIdx < 0 || targetIdx >= fp.branches.length) return null;

    // Walk to the deepest leaf of the target sibling branch
    // The server provides this info — we need to find the leaf.
    // For now, we use the branch switch endpoint which handles this server-side.
    // We return the childId and let the server find the leaf.
    return fp.branches[targetIdx].childId;
  }
  return null;
}

/**
 * Get sibling info for a message from branchInfo.
 * Returns { index, total } if the message is a child at a fork point, else null.
 */
export function getSiblingInfo(
  branchInfo: BranchInfo | null,
  messageId: string
): { index: number; total: number; childId: string } | null {
  if (!branchInfo) return null;

  for (const fp of branchInfo.forkPoints) {
    const branchIdx = fp.branches.findIndex((b) => b.childId === messageId);
    if (branchIdx !== -1) {
      return {
        index: branchIdx,
        total: fp.branches.length,
        childId: messageId,
      };
    }
  }
  return null;
}
