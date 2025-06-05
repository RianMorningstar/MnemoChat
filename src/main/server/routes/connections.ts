import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { connectionProfiles } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function connectionRoutes(app: FastifyInstance) {
  app.get("/api/connections", async () => {
    return db.select().from(connectionProfiles).all();
  });

  app.post("/api/connections", async (request) => {
    const body = request.body as {
      id: string;
      name: string;
      type?: string;
      endpoint: string;
      defaultModel?: string;
      contentTier?: string;
    };
    const now = new Date().toISOString();
    const profile = {
      id: body.id,
      name: body.name,
      type: body.type || "ollama",
      endpoint: body.endpoint,
      isActive: 0,
      defaultModel: body.defaultModel || null,
      contentTier: body.contentTier || null,
      createdAt: now,
      lastUsed: null,
    };
    await db.insert(connectionProfiles).values(profile);
    return profile;
  });

  app.put<{ Params: { id: string } }>(
    "/api/connections/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      if ("name" in body) updates.name = body.name;
      if ("endpoint" in body) updates.endpoint = body.endpoint;
      if ("defaultModel" in body) updates.defaultModel = body.defaultModel;
      if ("contentTier" in body) updates.contentTier = body.contentTier;
      if ("lastUsed" in body) updates.lastUsed = body.lastUsed;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      await db
        .update(connectionProfiles)
        .set(updates)
        .where(eq(connectionProfiles.id, id));
      return db
        .select()
        .from(connectionProfiles)
        .where(eq(connectionProfiles.id, id))
        .get();
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/connections/:id",
    async (request) => {
      const { id } = request.params;
      await db
        .delete(connectionProfiles)
        .where(eq(connectionProfiles.id, id));
      return { ok: true };
    }
  );

  app.put<{ Params: { id: string } }>(
    "/api/connections/:id/activate",
    async (request) => {
      const { id } = request.params;
      // Deactivate all
      await db.update(connectionProfiles).set({ isActive: 0 });
      // Activate the selected one
      await db
        .update(connectionProfiles)
        .set({ isActive: 1 })
        .where(eq(connectionProfiles.id, id));
      return db
        .select()
        .from(connectionProfiles)
        .where(eq(connectionProfiles.id, id))
        .get();
    }
  );
}
