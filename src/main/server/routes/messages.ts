import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { messages, bookmarks, swipeAlternatives, chats } from "../../db/schema";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
import { wordCount } from "../lib/chat-utils";
import {
  backfillParentIds,
  getBranchPath,
  computeBranchInfo,
  getDescendantIds,
  findAllLeaves,
} from "../lib/branch-logic";
import { deleteMessageEmbeddings } from "../lib/vector-memory";

function generateId(): string {
  return crypto.randomUUID();
}

function updateChatCounts(chatId: string) {
  const msgRows = db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .all();

  const bmCount = db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.chatId, chatId))
    .get();

  const lastMsg = db
    .select({ timestamp: messages.timestamp })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.timestamp))
    .limit(1)
    .get();

  const totalWords = msgRows.reduce((sum, m) => sum + wordCount(m.content || ""), 0);

  db.update(chats)
    .set({
      messageCount: msgRows.length,
      wordCount: totalWords,
      bookmarkCount: bmCount?.count || 0,
      lastMessageAt: lastMsg?.timestamp || null,
    })
    .where(eq(chats.id, chatId))
    .run();
}

export async function messageRoutes(app: FastifyInstance) {
  // List messages for a chat (branch-aware), with bookmark join
  app.get<{ Params: { chatId: string }; Querystring: { leafId?: string } }>(
    "/api/chats/:chatId/messages",
    async (request) => {
      const { chatId } = request.params;
      const { leafId } = request.query as { leafId?: string };

      // Lazy backfill for legacy chats
      backfillParentIds(chatId);

      const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
      const effectiveLeafId = leafId || chat?.activeLeafId || null;
      const pathMessages = getBranchPath(chatId, effectiveLeafId);

      // Get bookmarks for this chat
      const bms = db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.chatId, chatId))
        .all();

      const bmByMessage = new Map(bms.map((b) => [b.messageId, b]));

      const mappedMessages = pathMessages.map((m) => {
        const bm = bmByMessage.get(m.id);
        return {
          ...m,
          isSystemMessage: m.isSystemMessage === 1,
          bookmark: bm
            ? {
                id: bm.id,
                messageId: bm.messageId,
                label: bm.label,
                color: bm.color,
                messageIndex: bm.messageIndex,
                createdAt: bm.createdAt,
              }
            : null,
        };
      });

      const branchInfo = computeBranchInfo(chatId, pathMessages);

      return { messages: mappedMessages, branchInfo };
    }
  );

  // Create message (branch-aware)
  app.post<{ Params: { chatId: string } }>("/api/chats/:chatId/messages", async (request) => {
    const { chatId } = request.params;
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const content = (body.content as string) || "";

    // Determine parent: explicit, or current active leaf
    const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
    const parentId = (body.parentId as string) || chat?.activeLeafId || null;

    const record = {
      id,
      chatId,
      role: (body.role as string) || "user",
      content,
      timestamp: now,
      tokenCount: (body.tokenCount as number) || Math.ceil(content.length / 4),
      isSystemMessage: body.isSystemMessage ? 1 : 0,
      model: (body.model as string) || null,
      generationTimeMs: (body.generationTimeMs as number) || null,
      swipeIndex: (body.swipeIndex as number) ?? null,
      swipeCount: (body.swipeCount as number) ?? null,
      parentId,
      branchPosition: (body.branchPosition as number) ?? 0,
    };

    db.insert(messages).values(record).run();

    // Update active leaf to point to this new message
    db.update(chats)
      .set({ activeLeafId: id })
      .where(eq(chats.id, chatId))
      .run();

    updateChatCounts(chatId);

    return { ...record, isSystemMessage: record.isSystemMessage === 1, bookmark: null };
  });

  // Update message content (inline edit)
  app.put<{ Params: { id: string } }>("/api/messages/:id", async (request, reply) => {
    const { id } = request.params;
    const body = request.body as { content: string };

    const msg = db.select().from(messages).where(eq(messages.id, id)).get();
    if (!msg) return reply.status(404).send({ error: "Message not found" });

    const tokenCount = Math.ceil(body.content.length / 4);
    db.update(messages)
      .set({ content: body.content, tokenCount })
      .where(eq(messages.id, id))
      .run();

    // Clear stale embeddings so they re-embed with new content
    deleteMessageEmbeddings(id);

    updateChatCounts(msg.chatId);

    return { ok: true };
  });

  // Delete message (with descendant cascade)
  app.delete<{ Params: { id: string } }>("/api/messages/:id", async (request, reply) => {
    const { id } = request.params;

    const msg = db.select().from(messages).where(eq(messages.id, id)).get();
    if (!msg) return reply.status(404).send({ error: "Message not found" });

    // Get all messages in chat to find descendants
    const allMessages = db
      .select()
      .from(messages)
      .where(eq(messages.chatId, msg.chatId))
      .all();

    const idsToDelete = getDescendantIds(id, allMessages);

    // Delete swipe alternatives, bookmarks, and embeddings for all affected messages
    for (const delId of idsToDelete) {
      db.delete(swipeAlternatives).where(eq(swipeAlternatives.messageId, delId)).run();
      db.delete(bookmarks).where(eq(bookmarks.messageId, delId)).run();
      deleteMessageEmbeddings(delId);
      db.delete(messages).where(eq(messages.id, delId)).run();
    }

    // If deleted message was on active path, move activeLeafId to parent
    const chat = db.select().from(chats).where(eq(chats.id, msg.chatId)).get();
    if (chat?.activeLeafId && idsToDelete.includes(chat.activeLeafId)) {
      db.update(chats)
        .set({ activeLeafId: msg.parentId || null })
        .where(eq(chats.id, msg.chatId))
        .run();
    }

    updateChatCounts(msg.chatId);

    return { ok: true };
  });

  // -------------------------------------------------------------------------
  // Branch routes
  // -------------------------------------------------------------------------

  // Create a branch from a message
  app.post<{ Params: { chatId: string } }>("/api/chats/:chatId/branch", async (request) => {
    const { chatId } = request.params;
    const body = request.body as {
      parentMessageId: string;
      message?: { role: string; content: string };
    };
    const now = new Date().toISOString();
    const id = generateId();

    // Find max branchPosition among existing siblings
    const siblings = db
      .select({ branchPosition: messages.branchPosition })
      .from(messages)
      .where(eq(messages.parentId, body.parentMessageId))
      .all();

    const maxPosition = siblings.reduce(
      (max, s) => Math.max(max, s.branchPosition ?? 0),
      -1
    );

    const content = body.message?.content || "";
    const record = {
      id,
      chatId,
      role: body.message?.role || "user",
      content,
      timestamp: now,
      tokenCount: Math.ceil(content.length / 4),
      isSystemMessage: 0,
      model: null,
      generationTimeMs: null,
      swipeIndex: null,
      swipeCount: null,
      parentId: body.parentMessageId,
      branchPosition: maxPosition + 1,
    };

    db.insert(messages).values(record).run();

    // Update active leaf
    db.update(chats)
      .set({ activeLeafId: id })
      .where(eq(chats.id, chatId))
      .run();

    updateChatCounts(chatId);

    // Return the new message and updated branch info
    const activePath = getBranchPath(chatId, id);
    const branchInfo = computeBranchInfo(chatId, activePath);

    return {
      message: { ...record, isSystemMessage: false, bookmark: null },
      branchInfo,
    };
  });

  // Switch active branch
  app.put<{ Params: { chatId: string } }>("/api/chats/:chatId/active-branch", async (request, reply) => {
    const { chatId } = request.params;
    const body = request.body as { leafId: string };

    // Validate leaf belongs to this chat
    const leaf = db.select().from(messages).where(eq(messages.id, body.leafId)).get();
    if (!leaf || leaf.chatId !== chatId) {
      return reply.status(404).send({ error: "Leaf message not found in this chat" });
    }

    db.update(chats)
      .set({ activeLeafId: body.leafId })
      .where(eq(chats.id, chatId))
      .run();

    // Return the new branch path
    const activePath = getBranchPath(chatId, body.leafId);
    const branchInfo = computeBranchInfo(chatId, activePath);

    // Get bookmarks
    const bms = db.select().from(bookmarks).where(eq(bookmarks.chatId, chatId)).all();
    const bmByMessage = new Map(bms.map((b) => [b.messageId, b]));

    const mappedMessages = activePath.map((m) => {
      const bm = bmByMessage.get(m.id);
      return {
        ...m,
        isSystemMessage: m.isSystemMessage === 1,
        bookmark: bm
          ? {
              id: bm.id,
              messageId: bm.messageId,
              label: bm.label,
              color: bm.color,
              messageIndex: bm.messageIndex,
              createdAt: bm.createdAt,
            }
          : null,
      };
    });

    return { messages: mappedMessages, branchInfo };
  });

  // List all branches (leaves) for the branch panel
  app.get<{ Params: { chatId: string } }>("/api/chats/:chatId/branches", async (request) => {
    const { chatId } = request.params;
    return { branches: findAllLeaves(chatId) };
  });

  // Delete a branch
  app.delete<{ Params: { chatId: string } }>("/api/chats/:chatId/branch", async (request) => {
    const { chatId } = request.params;
    const body = request.body as { messageId: string };

    const allMessages = db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .all();

    const idsToDelete = getDescendantIds(body.messageId, allMessages);

    for (const delId of idsToDelete) {
      db.delete(swipeAlternatives).where(eq(swipeAlternatives.messageId, delId)).run();
      db.delete(bookmarks).where(eq(bookmarks.messageId, delId)).run();
      deleteMessageEmbeddings(delId);
      db.delete(messages).where(eq(messages.id, delId)).run();
    }

    // If active leaf was deleted, switch to a sibling
    const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
    if (chat?.activeLeafId && idsToDelete.includes(chat.activeLeafId)) {
      const deletedMsg = allMessages.find((m) => m.id === body.messageId);
      const parentId = deletedMsg?.parentId;

      if (parentId) {
        // Find a sibling branch's leaf
        const remainingMessages = db
          .select()
          .from(messages)
          .where(eq(messages.chatId, chatId))
          .all();
        const siblingChild = remainingMessages.find((m) => m.parentId === parentId);
        if (siblingChild) {
          // Walk to deepest leaf of sibling
          let leafId = siblingChild.id;
          while (true) {
            const child = remainingMessages.find((m) => m.parentId === leafId);
            if (!child) break;
            leafId = child.id;
          }
          db.update(chats).set({ activeLeafId: leafId }).where(eq(chats.id, chatId)).run();
        } else {
          db.update(chats).set({ activeLeafId: parentId }).where(eq(chats.id, chatId)).run();
        }
      } else {
        db.update(chats).set({ activeLeafId: null }).where(eq(chats.id, chatId)).run();
      }
    }

    updateChatCounts(chatId);

    return { ok: true };
  });

  // -------------------------------------------------------------------------
  // Swipe & bookmark routes (unchanged)
  // -------------------------------------------------------------------------

  // List swipe alternatives
  app.get<{ Params: { messageId: string } }>("/api/messages/:messageId/swipes", async (request) => {
    const { messageId } = request.params;
    return db
      .select()
      .from(swipeAlternatives)
      .where(eq(swipeAlternatives.messageId, messageId))
      .orderBy(asc(swipeAlternatives.index))
      .all();
  });

  // Create swipe alternative
  app.post<{ Params: { messageId: string } }>("/api/messages/:messageId/swipes", async (request) => {
    const { messageId } = request.params;
    const body = request.body as Record<string, unknown>;
    const id = generateId();

    // Get current max index
    const maxIdx = db
      .select({ max: sql<number>`coalesce(max("index"), -1)` })
      .from(swipeAlternatives)
      .where(eq(swipeAlternatives.messageId, messageId))
      .get();

    const newIndex = (maxIdx?.max ?? -1) + 1;

    const record = {
      id,
      messageId,
      index: newIndex,
      content: (body.content as string) || "",
      tokenCount: (body.tokenCount as number) || 0,
      generationTimeMs: (body.generationTimeMs as number) || 0,
      model: (body.model as string) || "",
    };

    db.insert(swipeAlternatives).values(record).run();

    // Update message swipeCount
    const count = db
      .select({ count: sql<number>`count(*)` })
      .from(swipeAlternatives)
      .where(eq(swipeAlternatives.messageId, messageId))
      .get();

    db.update(messages)
      .set({ swipeCount: (count?.count || 0) + 1 }) // +1 for original
      .where(eq(messages.id, messageId))
      .run();

    return record;
  });

  // Switch active swipe
  app.patch<{ Params: { messageId: string; index: string } }>(
    "/api/messages/:messageId/swipes/:index",
    async (request) => {
      const { messageId } = request.params;
      const targetIndex = parseInt(request.params.index, 10);

      const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
      if (!msg) return { error: "Message not found" };

      const alt = db
        .select()
        .from(swipeAlternatives)
        .where(and(eq(swipeAlternatives.messageId, messageId), eq(swipeAlternatives.index, targetIndex)))
        .get();
      if (!alt) return { error: "Swipe alternative not found" };

      // Save current message content back to swipe_alternatives at its current index
      const currentIndex = msg.swipeIndex ?? 0;
      const existing = db
        .select()
        .from(swipeAlternatives)
        .where(and(eq(swipeAlternatives.messageId, messageId), eq(swipeAlternatives.index, currentIndex)))
        .get();

      if (existing) {
        db.update(swipeAlternatives)
          .set({
            content: msg.content,
            tokenCount: msg.tokenCount,
            model: msg.model || "",
            generationTimeMs: msg.generationTimeMs,
          })
          .where(eq(swipeAlternatives.id, existing.id))
          .run();
      } else {
        // Original content not yet saved — create alt for index 0
        db.insert(swipeAlternatives)
          .values({
            id: generateId(),
            messageId,
            index: currentIndex,
            content: msg.content || "",
            tokenCount: msg.tokenCount || 0,
            generationTimeMs: msg.generationTimeMs || 0,
            model: msg.model || "",
          })
          .run();
      }

      // Update message to show the target alternative
      db.update(messages)
        .set({
          content: alt.content,
          swipeIndex: targetIndex,
          tokenCount: alt.tokenCount,
          model: alt.model,
          generationTimeMs: alt.generationTimeMs,
        })
        .where(eq(messages.id, messageId))
        .run();

      const updated = db.select().from(messages).where(eq(messages.id, messageId)).get();
      const bm = db.select().from(bookmarks).where(eq(bookmarks.messageId, messageId)).get();

      return { ...updated, isSystemMessage: !!updated?.isSystemMessage, bookmark: bm || null };
    },
  );

  // Create bookmark
  app.post<{ Params: { messageId: string } }>("/api/messages/:messageId/bookmark", async (request) => {
    const { messageId } = request.params;
    const body = request.body as { label?: string; color?: string };
    const now = new Date().toISOString();
    const id = generateId();

    const msg = db.select().from(messages).where(eq(messages.id, messageId)).get();
    if (!msg) return { error: "Message not found" };

    // Compute messageIndex (position in chat)
    const allMsgs = db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, msg.chatId))
      .orderBy(asc(messages.timestamp))
      .all();

    const messageIndex = allMsgs.findIndex((m) => m.id === messageId);

    const record = {
      id,
      messageId,
      chatId: msg.chatId,
      label: body.label || "",
      color: body.color || "indigo",
      messageIndex,
      createdAt: now,
    };

    db.insert(bookmarks).values(record).run();
    updateChatCounts(msg.chatId);

    return record;
  });

  // Delete bookmark
  app.delete<{ Params: { id: string } }>("/api/bookmarks/:id", async (request) => {
    const { id } = request.params;

    const bm = db.select().from(bookmarks).where(eq(bookmarks.id, id)).get();
    if (bm) {
      db.delete(bookmarks).where(eq(bookmarks.id, id)).run();
      updateChatCounts(bm.chatId);
    }

    return { ok: true };
  });

  // List bookmarks for a chat
  app.get<{ Params: { chatId: string } }>("/api/chats/:chatId/bookmarks", async (request) => {
    const { chatId } = request.params;
    return db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.chatId, chatId))
      .orderBy(asc(bookmarks.messageIndex))
      .all();
  });
}
