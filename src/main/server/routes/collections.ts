import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { collections, characterCollections } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

export async function collectionRoutes(app: FastifyInstance) {
  // List all collections with computed memberCount
  app.get("/api/collections", async () => {
    const rows = db.select().from(collections).all();
    const counts = db
      .select({
        collectionId: characterCollections.collectionId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(characterCollections)
      .groupBy(characterCollections.collectionId)
      .all();

    const countMap = new Map(counts.map((c) => [c.collectionId, c.count]));

    return rows.map((row) => ({
      ...row,
      memberCount: countMap.get(row.id) || 0,
    }));
  });

  // Create collection
  app.post("/api/collections", async (request) => {
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const record = {
      id,
      name: (body.name as string) || "New Collection",
      description: (body.description as string) || "",
      coverUrl: (body.coverUrl as string) || "",
      sortOrder: (body.sortOrder as number) ?? 0,
      createdAt: now,
    };

    await db.insert(collections).values(record);
    return { ...record, memberCount: 0 };
  });

  // Update collection
  app.put<{ Params: { id: string } }>(
    "/api/collections/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      for (const field of [
        "name",
        "description",
        "coverUrl",
        "sortOrder",
      ] as const) {
        if (field in body) updates[field] = body[field];
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      await db
        .update(collections)
        .set(updates)
        .where(eq(collections.id, id));

      const row = db
        .select()
        .from(collections)
        .where(eq(collections.id, id))
        .get();
      if (!row)
        return reply.status(404).send({ error: "Collection not found" });

      return row;
    }
  );

  // Delete collection (cascade join rows, NOT characters)
  app.delete<{ Params: { id: string } }>(
    "/api/collections/:id",
    async (request) => {
      const { id } = request.params;
      await db
        .delete(characterCollections)
        .where(eq(characterCollections.collectionId, id));
      await db.delete(collections).where(eq(collections.id, id));
      return { ok: true };
    }
  );

  // Add characters to collection
  app.post<{ Params: { id: string } }>(
    "/api/collections/:id/characters",
    async (request) => {
      const { id } = request.params;
      const body = request.body as { characterIds: string[] };

      for (const characterId of body.characterIds) {
        await db
          .insert(characterCollections)
          .values({ characterId, collectionId: id })
          .onConflictDoNothing();
      }

      return { ok: true };
    }
  );

  // Remove character from collection
  app.delete<{ Params: { id: string; characterId: string } }>(
    "/api/collections/:id/characters/:characterId",
    async (request) => {
      const { id, characterId } = request.params;
      await db
        .delete(characterCollections)
        .where(
          sql`${characterCollections.collectionId} = ${id} AND ${characterCollections.characterId} = ${characterId}`
        );
      return { ok: true };
    }
  );
}
