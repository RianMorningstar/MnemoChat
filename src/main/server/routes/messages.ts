import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { messages, bookmarks, swipeAlternatives, chats } from "../../db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { wordCount } from "../lib/chat-utils";

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
  // List messages for a chat, with bookmark join
  app.get<{ Params: { chatId: string } }>("/api/chats/:chatId/messages", async (request) => {
    const { chatId } = request.params;

    const rows = db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.timestamp))
      .all();

    // Get bookmarks for this chat
    const bms = db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.chatId, chatId))
      .all();

    const bmByMessage = new Map(bms.map((b) => [b.messageId, b]));

    return rows.map((m) => {
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
  });

  // Create message
  app.post<{ Params: { chatId: string } }>("/api/chats/:chatId/messages", async (request) => {
    const { chatId } = request.params;
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const content = (body.content as string) || "";

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
    };

    db.insert(messages).values(record).run();
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

    updateChatCounts(msg.chatId);

    return { ok: true };
  });

  // Delete message
  app.delete<{ Params: { id: string } }>("/api/messages/:id", async (request, reply) => {
    const { id } = request.params;

    const msg = db.select().from(messages).where(eq(messages.id, id)).get();
    if (!msg) return reply.status(404).send({ error: "Message not found" });

    db.delete(swipeAlternatives).where(eq(swipeAlternatives.messageId, id)).run();
    db.delete(bookmarks).where(eq(bookmarks.messageId, id)).run();
    db.delete(messages).where(eq(messages.id, id)).run();

    updateChatCounts(msg.chatId);

    return { ok: true };
  });

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
