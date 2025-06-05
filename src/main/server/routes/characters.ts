import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import {
  characters,
  lorebookEntries,
  chats,
  characterCollections,
  lorebookCharacters,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

export async function characterRoutes(app: FastifyInstance) {
  // List all characters with lorebook entry count
  app.get("/api/characters", async () => {
    const rows = db.select().from(characters).all();
    const counts = db
      .select({
        characterId: lorebookEntries.characterId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(lorebookEntries)
      .groupBy(lorebookEntries.characterId)
      .all();

    const countMap = new Map(counts.map((c) => [c.characterId, c.count]));

    return rows.map((row) => ({
      ...row,
      alternateGreetings: JSON.parse(row.alternateGreetings || "[]"),
      exampleDialogues: JSON.parse(row.exampleDialogues || "[]"),
      tags: JSON.parse(row.tags || "[]"),
      lorebookEntryCount: countMap.get(row.id) || 0,
    }));
  });

  // Get single character
  app.get<{ Params: { id: string } }>(
    "/api/characters/:id",
    async (request, reply) => {
      const { id } = request.params;
      const row = db
        .select()
        .from(characters)
        .where(eq(characters.id, id))
        .get();

      if (!row) return reply.status(404).send({ error: "Character not found" });

      const count = db
        .select({ count: sql<number>`count(*)` })
        .from(lorebookEntries)
        .where(eq(lorebookEntries.characterId, id))
        .get();

      return {
        ...row,
        alternateGreetings: JSON.parse(row.alternateGreetings || "[]"),
        exampleDialogues: JSON.parse(row.exampleDialogues || "[]"),
        tags: JSON.parse(row.tags || "[]"),
        lorebookEntryCount: count?.count || 0,
      };
    }
  );

  // Create character
  app.post("/api/characters", async (request) => {
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = (body.id as string) || generateId();

    const record = {
      id,
      name: (body.name as string) || "New Character",
      portraitUrl: (body.portraitUrl as string) || null,
      description: (body.description as string) || null,
      personality: (body.personality as string) || null,
      scenario: (body.scenario as string) || null,
      firstMessage: (body.firstMessage as string) || null,
      alternateGreetings: JSON.stringify(body.alternateGreetings || []),
      systemPrompt: (body.systemPrompt as string) || null,
      postHistoryInstructions: (body.postHistoryInstructions as string) || null,
      exampleDialogues: JSON.stringify(body.exampleDialogues || []),
      creatorNotes: (body.creatorNotes as string) || null,
      tags: JSON.stringify(body.tags || []),
      contentTier: (body.contentTier as string) || "sfw",
      creatorName: (body.creatorName as string) || null,
      characterVersion: (body.characterVersion as string) || null,
      sourceUrl: (body.sourceUrl as string) || null,
      specVersion: (body.specVersion as string) || "v2",
      importDate: (body.importDate as string) || null,
      createdAt: now,
      lastChatted: null,
      tokenCount: (body.tokenCount as number) || 0,
      internalNotes: (body.internalNotes as string) || null,
      source: (body.source as string) || "local",
      communityRefJson: (body.communityRefJson as string) || null,
    };

    await db.insert(characters).values(record);

    return {
      ...record,
      alternateGreetings: JSON.parse(record.alternateGreetings),
      exampleDialogues: JSON.parse(record.exampleDialogues),
      tags: JSON.parse(record.tags),
      lorebookEntryCount: 0,
    };
  });

  // Update character (partial)
  app.put<{ Params: { id: string } }>(
    "/api/characters/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      const jsonFields = ["alternateGreetings", "exampleDialogues", "tags"];
      const textFields = [
        "name", "portraitUrl", "description", "personality", "scenario",
        "firstMessage", "systemPrompt", "postHistoryInstructions",
        "creatorNotes", "contentTier", "creatorName", "characterVersion",
        "sourceUrl", "specVersion", "importDate", "lastChatted", "internalNotes",
        "source", "communityRefJson",
      ];

      for (const field of textFields) {
        if (field in body) updates[field] = body[field];
      }
      for (const field of jsonFields) {
        if (field in body) updates[field] = JSON.stringify(body[field]);
      }
      if ("tokenCount" in body) updates.tokenCount = body.tokenCount;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      await db.update(characters).set(updates).where(eq(characters.id, id));

      const row = db
        .select()
        .from(characters)
        .where(eq(characters.id, id))
        .get();

      if (!row) return reply.status(404).send({ error: "Character not found" });

      return {
        ...row,
        alternateGreetings: JSON.parse(row.alternateGreetings || "[]"),
        exampleDialogues: JSON.parse(row.exampleDialogues || "[]"),
        tags: JSON.parse(row.tags || "[]"),
      };
    }
  );

  // Delete character (cascades lorebook entries)
  app.delete<{ Params: { id: string } }>(
    "/api/characters/:id",
    async (request) => {
      const { id } = request.params;
      await db
        .delete(lorebookEntries)
        .where(eq(lorebookEntries.characterId, id));
      await db.delete(characters).where(eq(characters.id, id));
      return { ok: true };
    }
  );

  // Duplicate character
  app.post<{ Params: { id: string } }>(
    "/api/characters/:id/duplicate",
    async (request, reply) => {
      const { id } = request.params;
      const original = db
        .select()
        .from(characters)
        .where(eq(characters.id, id))
        .get();

      if (!original)
        return reply.status(404).send({ error: "Character not found" });

      const newId = generateId();
      const now = new Date().toISOString();

      await db.insert(characters).values({
        ...original,
        id: newId,
        name: `${original.name} (Copy)`,
        createdAt: now,
        lastChatted: null,
      });

      // Duplicate lorebook entries
      const entries = db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.characterId, id))
        .all();

      for (const entry of entries) {
        await db.insert(lorebookEntries).values({
          ...entry,
          id: generateId(),
          characterId: newId,
        });
      }

      const row = db
        .select()
        .from(characters)
        .where(eq(characters.id, newId))
        .get();

      return {
        ...row!,
        alternateGreetings: JSON.parse(row!.alternateGreetings || "[]"),
        exampleDialogues: JSON.parse(row!.exampleDialogues || "[]"),
        tags: JSON.parse(row!.tags || "[]"),
        lorebookEntryCount: entries.length,
      };
    }
  );

  // Library characters — enriched with collections, message counts, etc.
  app.get("/api/library/characters", async () => {
    const rows = db.select().from(characters).all();

    // Lorebook entry counts per character
    const lbCounts = db
      .select({
        characterId: lorebookEntries.characterId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(lorebookEntries)
      .groupBy(lorebookEntries.characterId)
      .all();
    const lbCountMap = new Map(lbCounts.map((c) => [c.characterId, c.count]));

    // Lorebook attachment counts via lorebookCharacters
    const lbAttachments = db
      .select({
        characterId: lorebookCharacters.characterId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(lorebookCharacters)
      .groupBy(lorebookCharacters.characterId)
      .all();
    const lbAttachMap = new Map(
      lbAttachments.map((c) => [c.characterId, c.count])
    );

    // Message counts per character (SUM of messageCount across chats)
    const msgCounts = db
      .select({
        characterId: chats.characterId,
        total: sql<number>`COALESCE(SUM(${chats.messageCount}), 0)`.as(
          "total"
        ),
      })
      .from(chats)
      .groupBy(chats.characterId)
      .all();
    const msgCountMap = new Map(
      msgCounts.map((c) => [c.characterId, c.total])
    );

    // Collection memberships
    const collMemberships = db.select().from(characterCollections).all();
    const collMap = new Map<string, string[]>();
    for (const m of collMemberships) {
      if (!collMap.has(m.characterId)) collMap.set(m.characterId, []);
      collMap.get(m.characterId)!.push(m.collectionId);
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      portraitUrl: row.portraitUrl || "",
      tags: JSON.parse(row.tags || "[]"),
      contentTier: row.contentTier || "sfw",
      lastChatted: row.lastChatted,
      messageCount: msgCountMap.get(row.id) || 0,
      tokenCount: row.tokenCount || 0,
      collectionIds: collMap.get(row.id) || [],
      source: row.source || "local",
      communityRef: row.communityRefJson
        ? JSON.parse(row.communityRefJson)
        : null,
      lorebookCount:
        (lbCountMap.get(row.id) || 0) + (lbAttachMap.get(row.id) || 0),
      hasPortrait: !!row.portraitUrl,
    }));
  });

  // Bulk delete characters
  app.post("/api/characters/bulk-delete", async (request) => {
    const { ids } = request.body as { ids: string[] };
    if (!ids || ids.length === 0) return { ok: true, deleted: 0 };

    for (const id of ids) {
      await db
        .delete(lorebookEntries)
        .where(eq(lorebookEntries.characterId, id));
      await db
        .delete(characterCollections)
        .where(eq(characterCollections.characterId, id));
      await db
        .delete(lorebookCharacters)
        .where(eq(lorebookCharacters.characterId, id));
      await db.delete(characters).where(eq(characters.id, id));
    }

    return { ok: true, deleted: ids.length };
  });

  // Bulk tag characters
  app.post("/api/characters/bulk-tag", async (request) => {
    const { ids, tags } = request.body as { ids: string[]; tags: string[] };
    if (!ids || ids.length === 0) return { ok: true };

    for (const id of ids) {
      const row = db
        .select()
        .from(characters)
        .where(eq(characters.id, id))
        .get();
      if (!row) continue;

      const existing: string[] = JSON.parse(row.tags || "[]");
      const merged = [...new Set([...existing, ...tags])];
      await db
        .update(characters)
        .set({ tags: JSON.stringify(merged) })
        .where(eq(characters.id, id));
    }

    return { ok: true };
  });
}
