import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import {
  lorebooks,
  lorebookCharacters,
  lorebookEntries,
  characters,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

export async function libraryLorebookRoutes(app: FastifyInstance) {
  // List all lorebooks with entryCount + attached character info
  app.get("/api/lorebooks", async () => {
    const rows = db.select().from(lorebooks).all();

    // Get entry counts per lorebook
    const entryCounts = db
      .select({
        lorebookId: lorebookEntries.lorebookId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(lorebookEntries)
      .where(sql`${lorebookEntries.lorebookId} IS NOT NULL`)
      .groupBy(lorebookEntries.lorebookId)
      .all();

    const entryCountMap = new Map(
      entryCounts.map((c) => [c.lorebookId, c.count])
    );

    // Get attached characters
    const attachments = db
      .select({
        lorebookId: lorebookCharacters.lorebookId,
        characterId: lorebookCharacters.characterId,
        characterName: characters.name,
      })
      .from(lorebookCharacters)
      .leftJoin(characters, eq(lorebookCharacters.characterId, characters.id))
      .all();

    const attachmentMap = new Map<
      string,
      { ids: string[]; names: string[] }
    >();
    for (const a of attachments) {
      if (!attachmentMap.has(a.lorebookId)) {
        attachmentMap.set(a.lorebookId, { ids: [], names: [] });
      }
      const entry = attachmentMap.get(a.lorebookId)!;
      entry.ids.push(a.characterId);
      if (a.characterName) entry.names.push(a.characterName);
    }

    return rows.map((row) => {
      const att = attachmentMap.get(row.id);
      return {
        ...row,
        tags: JSON.parse(row.tags || "[]"),
        entryCount: entryCountMap.get(row.id) || 0,
        attachedCharacterIds: att?.ids || [],
        attachedCharacterNames: att?.names || [],
      };
    });
  });

  // Create lorebook
  app.post("/api/lorebooks", async (request) => {
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const record = {
      id,
      name: (body.name as string) || "New Lorebook",
      tags: JSON.stringify(body.tags || []),
      coverColor: (body.coverColor as string) || "zinc",
      lastModified: now,
      createdAt: now,
    };

    await db.insert(lorebooks).values(record);
    return {
      ...record,
      tags: JSON.parse(record.tags),
      entryCount: 0,
      attachedCharacterIds: [],
      attachedCharacterNames: [],
    };
  });

  // Update lorebook
  app.put<{ Params: { id: string } }>(
    "/api/lorebooks/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      if ("name" in body) updates.name = body.name;
      if ("coverColor" in body) updates.coverColor = body.coverColor;
      if ("tags" in body) updates.tags = JSON.stringify(body.tags);
      updates.lastModified = new Date().toISOString();

      await db.update(lorebooks).set(updates).where(eq(lorebooks.id, id));

      const row = db.select().from(lorebooks).where(eq(lorebooks.id, id)).get();
      if (!row) return reply.status(404).send({ error: "Lorebook not found" });

      return { ...row, tags: JSON.parse(row.tags || "[]") };
    }
  );

  // Delete lorebook + cascade entries
  app.delete<{ Params: { id: string } }>(
    "/api/lorebooks/:id",
    async (request) => {
      const { id } = request.params;
      await db
        .delete(lorebookEntries)
        .where(eq(lorebookEntries.lorebookId, id));
      await db
        .delete(lorebookCharacters)
        .where(eq(lorebookCharacters.lorebookId, id));
      await db.delete(lorebooks).where(eq(lorebooks.id, id));
      return { ok: true };
    }
  );

  // Duplicate lorebook
  app.post<{ Params: { id: string } }>(
    "/api/lorebooks/:id/duplicate",
    async (request, reply) => {
      const { id } = request.params;
      const original = db
        .select()
        .from(lorebooks)
        .where(eq(lorebooks.id, id))
        .get();

      if (!original)
        return reply.status(404).send({ error: "Lorebook not found" });

      const newId = generateId();
      const now = new Date().toISOString();

      await db.insert(lorebooks).values({
        ...original,
        id: newId,
        name: `${original.name} (Copy)`,
        createdAt: now,
        lastModified: now,
      });

      // Duplicate entries
      const entries = db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.lorebookId, id))
        .all();

      for (const entry of entries) {
        await db.insert(lorebookEntries).values({
          ...entry,
          id: generateId(),
          lorebookId: newId,
        });
      }

      // Duplicate character attachments
      const attachments = db
        .select()
        .from(lorebookCharacters)
        .where(eq(lorebookCharacters.lorebookId, id))
        .all();

      for (const att of attachments) {
        await db.insert(lorebookCharacters).values({
          lorebookId: newId,
          characterId: att.characterId,
        });
      }

      const row = db
        .select()
        .from(lorebooks)
        .where(eq(lorebooks.id, newId))
        .get();

      return {
        ...row!,
        tags: JSON.parse(row!.tags || "[]"),
        entryCount: entries.length,
      };
    }
  );

  // Attach lorebook to characters
  app.put<{ Params: { id: string } }>(
    "/api/lorebooks/:id/attach",
    async (request) => {
      const { id } = request.params;
      const body = request.body as { characterIds: string[] };

      // Clear existing attachments
      await db
        .delete(lorebookCharacters)
        .where(eq(lorebookCharacters.lorebookId, id));

      // Insert new ones
      for (const characterId of body.characterIds) {
        await db
          .insert(lorebookCharacters)
          .values({ lorebookId: id, characterId });
      }

      await db
        .update(lorebooks)
        .set({ lastModified: new Date().toISOString() })
        .where(eq(lorebooks.id, id));

      return { ok: true };
    }
  );

  // Import lorebook from JSON
  app.post("/api/lorebooks/import", async (request, reply) => {
    const body = request.body as {
      name: string;
      tags?: string[];
      coverColor?: string;
      entries?: Array<{
        keywords: string[];
        content: string;
        insertionPosition?: string;
        priority?: number;
        enabled?: boolean;
        logic?: string;
        probability?: number;
        scanDepth?: number;
      }>;
    };

    const now = new Date().toISOString();
    const lorebookId = generateId();

    await db.insert(lorebooks).values({
      id: lorebookId,
      name: body.name || "Imported Lorebook",
      tags: JSON.stringify(body.tags || []),
      coverColor: body.coverColor || "zinc",
      lastModified: now,
      createdAt: now,
    });

    const entries = body.entries || [];
    for (const e of entries) {
      await db.insert(lorebookEntries).values({
        id: generateId(),
        characterId: "",
        lorebookId,
        keywords: JSON.stringify(e.keywords || []),
        content: e.content ?? null,
        insertionPosition: e.insertionPosition || "before_character",
        priority: e.priority ?? 50,
        enabled: e.enabled !== false ? 1 : 0,
        logic: e.logic || "AND_ANY",
        probability: e.probability ?? 100,
        scanDepth: e.scanDepth ?? 0,
      });
    }

    return reply.status(201).send({
      id: lorebookId,
      name: body.name || "Imported Lorebook",
      tags: body.tags || [],
      coverColor: body.coverColor || "zinc",
      entryCount: entries.length,
      attachedCharacterIds: [],
      attachedCharacterNames: [],
      lastModified: now,
      createdAt: now,
    });
  });

  // Export lorebook as JSON
  app.get<{ Params: { id: string } }>(
    "/api/lorebooks/:id/export",
    async (request, reply) => {
      const { id } = request.params;
      const row = db
        .select()
        .from(lorebooks)
        .where(eq(lorebooks.id, id))
        .get();

      if (!row) return reply.status(404).send({ error: "Lorebook not found" });

      const entries = db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.lorebookId, id))
        .all();

      return {
        name: row.name,
        tags: JSON.parse(row.tags || "[]"),
        coverColor: row.coverColor,
        entries: entries.map((e) => ({
          keywords: JSON.parse(e.keywords || "[]"),
          content: e.content,
          insertionPosition: e.insertionPosition,
          priority: e.priority,
          enabled: e.enabled === 1,
        })),
      };
    }
  );
}
