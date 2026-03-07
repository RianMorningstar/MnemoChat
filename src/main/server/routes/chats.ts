import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { chats, characters, messages, bookmarks, sceneDirections, swipeAlternatives, chatCharacters } from "../../db/schema";
import { eq, desc, sql, asc, and } from "drizzle-orm";
import { wordCount, substituteVars } from "../lib/chat-utils";

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

function getChatCharacters(chatId: string) {
  return db
    .select({
      id: characters.id,
      name: characters.name,
      portraitUrl: characters.portraitUrl,
      position: chatCharacters.position,
    })
    .from(chatCharacters)
    .leftJoin(characters, eq(chatCharacters.characterId, characters.id))
    .where(eq(chatCharacters.chatId, chatId))
    .orderBy(asc(chatCharacters.position))
    .all()
    .map((r) => ({ id: r.id!, name: r.name ?? "Unknown", portraitUrl: r.portraitUrl ?? "" }));
}

export async function chatRoutes(app: FastifyInstance) {
  // List all chats with character join
  app.get("/api/chats", async () => {
    const rows = db
      .select({
        id: chats.id,
        title: chats.title,
        characterName: characters.name,
        characterPortraitUrl: characters.portraitUrl,
        lastMessageAt: chats.lastMessageAt,
        messageCount: chats.messageCount,
        bookmarkCount: chats.bookmarkCount,
        wordCount: chats.wordCount,
        tags: chats.tags,
      })
      .from(chats)
      .leftJoin(characters, eq(chats.characterId, characters.id))
      .orderBy(desc(chats.lastMessageAt))
      .all();

    return rows.map((r) => ({
      ...r,
      characterName: r.characterName || "Unknown",
      characterPortraitUrl: r.characterPortraitUrl || "",
      tags: JSON.parse((r.tags as string) || "[]"),
      characters: getChatCharacters(r.id),
    }));
  });

  // Get single chat with character join
  app.get<{ Params: { id: string } }>("/api/chats/:id", async (request, reply) => {
    const { id } = request.params;
    const row = db
      .select({
        id: chats.id,
        title: chats.title,
        characterId: chats.characterId,
        characterName: characters.name,
        characterPortraitUrl: characters.portraitUrl,
        characterTags: characters.tags,
        personaName: chats.personaName,
        modelId: chats.modelId,
        modelName: chats.modelName,
        createdAt: chats.createdAt,
        lastMessageAt: chats.lastMessageAt,
        messageCount: chats.messageCount,
        bookmarkCount: chats.bookmarkCount,
        wordCount: chats.wordCount,
        tags: chats.tags,
        activeLeafId: chats.activeLeafId,
      })
      .from(chats)
      .leftJoin(characters, eq(chats.characterId, characters.id))
      .where(eq(chats.id, id))
      .get();

    if (!row) return reply.status(404).send({ error: "Chat not found" });

    return {
      ...row,
      characterName: row.characterName || "Unknown",
      characterPortraitUrl: row.characterPortraitUrl || "",
      characterTags: JSON.parse((row.characterTags as string) || "[]"),
      tags: JSON.parse((row.tags as string) || "[]"),
      lastMessageAt: row.lastMessageAt || "",
      characters: getChatCharacters(id),
    };
  });

  // Create chat
  app.post("/api/chats", async (request) => {
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const characterId = body.characterId as string;
    const modelId = body.modelId as string;
    const modelName = body.modelName as string;

    const record = {
      id,
      title: (body.title as string) || "",
      characterId,
      personaName: (body.personaName as string) || "",
      modelId,
      modelName,
      createdAt: now,
      lastMessageAt: null as string | null,
      messageCount: 0,
      bookmarkCount: 0,
      wordCount: 0,
      tags: JSON.stringify([]),
    };

    db.insert(chats).values(record).run();

    // Populate chat_characters — primary character always first
    const allCharacterIds: string[] = [characterId];
    const extraIds = (body.characterIds as string[] | undefined) || [];
    for (const cid of extraIds) {
      if (cid !== characterId) allCharacterIds.push(cid);
    }
    allCharacterIds.forEach((cid, pos) => {
      db.insert(chatCharacters).values({ chatId: id, characterId: cid, position: pos }).onConflictDoNothing().run();
    });

    // Fetch character for firstMessage and authorNote seeding
    const character = db
      .select()
      .from(characters)
      .where(eq(characters.id, characterId))
      .get();

    // Create scene direction — seed from character's author note if present
    db.insert(sceneDirections)
      .values({
        id: generateId(),
        chatId: id,
        text: character?.authorNote || "",
        injectionDepth: character?.authorNoteDepth ?? 4,
        enabled: character?.authorNote ? 1 : 0,
        tokenCount: character?.authorNote
          ? Math.ceil(character.authorNote.length / 4)
          : 0,
      })
      .run();

    if (character?.firstMessage) {
      const personaName = (body.personaName as string) || "User";
      const firstMessageContent = substituteVars(character.firstMessage, {
        charName: character.name,
        userName: personaName,
        charDescription: character.description || undefined,
        charPersonality: character.personality || undefined,
        charScenario: character.scenario || undefined,
      });
      const msgId = generateId();
      db.insert(messages)
        .values({
          id: msgId,
          chatId: id,
          role: "assistant",
          content: firstMessageContent,
          timestamp: now,
          tokenCount: Math.ceil(firstMessageContent.length / 4),
          isSystemMessage: 0,
          model: modelId,
        })
        .run();

      updateChatCounts(id);
    }

    // Return full chat with character join
    const chat = db
      .select({
        id: chats.id,
        title: chats.title,
        characterId: chats.characterId,
        characterName: characters.name,
        characterPortraitUrl: characters.portraitUrl,
        characterTags: characters.tags,
        personaName: chats.personaName,
        modelId: chats.modelId,
        modelName: chats.modelName,
        createdAt: chats.createdAt,
        lastMessageAt: chats.lastMessageAt,
        messageCount: chats.messageCount,
        bookmarkCount: chats.bookmarkCount,
        wordCount: chats.wordCount,
        tags: chats.tags,
        activeLeafId: chats.activeLeafId,
      })
      .from(chats)
      .leftJoin(characters, eq(chats.characterId, characters.id))
      .where(eq(chats.id, id))
      .get();

    return {
      ...chat!,
      characterName: chat!.characterName || "Unknown",
      characterPortraitUrl: chat!.characterPortraitUrl || "",
      characterTags: JSON.parse((chat!.characterTags as string) || "[]"),
      tags: JSON.parse((chat!.tags as string) || "[]"),
      lastMessageAt: chat!.lastMessageAt || "",
      characters: getChatCharacters(id),
    };
  });

  // Update chat
  app.put<{ Params: { id: string } }>("/api/chats/:id", async (request, reply) => {
    const { id } = request.params;
    const body = request.body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("title" in body) updates.title = body.title;
    if ("modelId" in body) updates.modelId = body.modelId;
    if ("modelName" in body) updates.modelName = body.modelName;
    if ("tags" in body) updates.tags = JSON.stringify(body.tags);
    if ("personaName" in body) updates.personaName = body.personaName;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ error: "No fields to update" });
    }

    db.update(chats).set(updates).where(eq(chats.id, id)).run();

    return { ok: true };
  });

  // Delete chat + cascade
  app.delete<{ Params: { id: string } }>("/api/chats/:id", async (request) => {
    const { id } = request.params;

    // Get all message IDs for cascade
    const msgIds = db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.chatId, id))
      .all()
      .map((m) => m.id);

    // Delete swipe alternatives for those messages
    for (const msgId of msgIds) {
      db.delete(swipeAlternatives).where(eq(swipeAlternatives.messageId, msgId)).run();
    }

    db.delete(bookmarks).where(eq(bookmarks.chatId, id)).run();
    db.delete(messages).where(eq(messages.chatId, id)).run();
    db.delete(sceneDirections).where(eq(sceneDirections.chatId, id)).run();
    db.delete(chatCharacters).where(eq(chatCharacters.chatId, id)).run();
    db.delete(chats).where(eq(chats.id, id)).run();

    return { ok: true };
  });

  // Rename chat
  app.put<{ Params: { id: string } }>("/api/chats/:id/rename", async (request) => {
    const { id } = request.params;
    const body = request.body as { title: string };
    db.update(chats).set({ title: body.title }).where(eq(chats.id, id)).run();
    return { ok: true };
  });

  // Add character to group chat
  app.post<{ Params: { id: string } }>("/api/chats/:id/characters", async (request) => {
    const { id } = request.params;
    const body = request.body as { characterId: string };

    const existing = getChatCharacters(id);
    const position = existing.length;

    db.insert(chatCharacters)
      .values({ chatId: id, characterId: body.characterId, position })
      .onConflictDoNothing()
      .run();

    return { characters: getChatCharacters(id) };
  });

  // Remove character from group chat
  app.delete<{ Params: { id: string; characterId: string } }>(
    "/api/chats/:id/characters/:characterId",
    async (request) => {
      const { id, characterId } = request.params;

      db.delete(chatCharacters)
        .where(and(eq(chatCharacters.chatId, id), eq(chatCharacters.characterId, characterId)))
        .run();

      return { characters: getChatCharacters(id) };
    }
  );

  // Token budget
  app.get<{ Params: { id: string } }>("/api/chats/:id/token-budget", async (request, reply) => {
    const { id } = request.params;

    const chat = db.select().from(chats).where(eq(chats.id, id)).get();
    if (!chat) return reply.status(404).send({ error: "Chat not found" });

    const character = db
      .select()
      .from(characters)
      .where(eq(characters.id, chat.characterId))
      .get();

    const scene = db
      .select()
      .from(sceneDirections)
      .where(eq(sceneDirections.chatId, id))
      .get();

    const msgTokenSum = db
      .select({ total: sql<number>`coalesce(sum(token_count), 0)` })
      .from(messages)
      .where(eq(messages.chatId, id))
      .get();

    const contextMax = 4096;
    const systemPrompt = character?.systemPrompt ? Math.ceil(character.systemPrompt.length / 4) : 0;
    const characterCard = character?.tokenCount || 0;
    const chatHistory = msgTokenSum?.total || 0;
    const sceneDirection = scene?.enabled ? (scene.tokenCount || 0) : 0;
    const used = systemPrompt + characterCard + chatHistory + sceneDirection;
    const available = Math.max(0, contextMax - used);

    return {
      contextMax,
      systemPrompt,
      characterCard,
      chatHistory,
      sceneDirection,
      available,
      scrollingOutSoon: available < contextMax * 0.15,
    };
  });
}
