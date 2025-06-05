import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { lorebookEntries } from "../../db/schema";
import { eq } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

export async function lorebookRoutes(app: FastifyInstance) {
  // List entries for a character
  app.get<{ Params: { characterId: string } }>(
    "/api/characters/:characterId/lorebook",
    async (request) => {
      const { characterId } = request.params;
      const rows = db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.characterId, characterId))
        .all();

      return rows.map((row) => ({
        ...row,
        keywords: JSON.parse(row.keywords || "[]"),
        enabled: row.enabled === 1,
      }));
    }
  );

  // Create entry
  app.post<{ Params: { characterId: string } }>(
    "/api/characters/:characterId/lorebook",
    async (request) => {
      const { characterId } = request.params;
      const body = request.body as Record<string, unknown>;
      const id = generateId();

      const record = {
        id,
        characterId,
        keywords: JSON.stringify(body.keywords || []),
        content: (body.content as string) || null,
        insertionPosition:
          (body.insertionPosition as string) || "before_character",
        priority: (body.priority as number) ?? 50,
        enabled: 1,
      };

      await db.insert(lorebookEntries).values(record);

      return {
        ...record,
        keywords: JSON.parse(record.keywords),
        enabled: true,
      };
    }
  );

  // Update entry
  app.put<{ Params: { id: string } }>(
    "/api/lorebook/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      if ("keywords" in body) updates.keywords = JSON.stringify(body.keywords);
      if ("content" in body) updates.content = body.content;
      if ("insertionPosition" in body)
        updates.insertionPosition = body.insertionPosition;
      if ("priority" in body) updates.priority = body.priority;
      if ("enabled" in body) updates.enabled = body.enabled ? 1 : 0;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      await db
        .update(lorebookEntries)
        .set(updates)
        .where(eq(lorebookEntries.id, id));

      const row = db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.id, id))
        .get();

      if (!row) return reply.status(404).send({ error: "Entry not found" });

      return {
        ...row,
        keywords: JSON.parse(row.keywords || "[]"),
        enabled: row.enabled === 1,
      };
    }
  );

  // Delete entry
  app.delete<{ Params: { id: string } }>(
    "/api/lorebook/:id",
    async (request) => {
      const { id } = request.params;
      await db.delete(lorebookEntries).where(eq(lorebookEntries.id, id));
      return { ok: true };
    }
  );

  // Toggle enabled
  app.put<{ Params: { id: string } }>(
    "/api/lorebook/:id/toggle",
    async (request, reply) => {
      const { id } = request.params;
      const row = db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.id, id))
        .get();

      if (!row) return reply.status(404).send({ error: "Entry not found" });

      const newEnabled = row.enabled === 1 ? 0 : 1;
      await db
        .update(lorebookEntries)
        .set({ enabled: newEnabled })
        .where(eq(lorebookEntries.id, id));

      return {
        ...row,
        enabled: newEnabled === 1,
        keywords: JSON.parse(row.keywords || "[]"),
      };
    }
  );
}
