import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { personas } from "../../db/schema";
import { eq } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

export async function personaRoutes(app: FastifyInstance) {
  // List all personas
  app.get("/api/personas", async () => {
    const rows = db.select().from(personas).all();
    return rows.map((r) => ({
      ...r,
      isDefault: r.isDefault === 1,
    }));
  });

  // Create persona
  app.post("/api/personas", async (request) => {
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const record = {
      id,
      name: (body.name as string) || "New Persona",
      description: (body.description as string) || "",
      avatarUrl: (body.avatarUrl as string) || "",
      isDefault: 0,
      lastUsed: now,
      createdAt: now,
    };

    await db.insert(personas).values(record);
    return { ...record, isDefault: false };
  });

  // Update persona
  app.put<{ Params: { id: string } }>(
    "/api/personas/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      for (const field of ["name", "description", "avatarUrl"] as const) {
        if (field in body) updates[field] = body[field];
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      await db.update(personas).set(updates).where(eq(personas.id, id));

      const row = db.select().from(personas).where(eq(personas.id, id)).get();
      if (!row) return reply.status(404).send({ error: "Persona not found" });

      return { ...row, isDefault: row.isDefault === 1 };
    }
  );

  // Delete persona
  app.delete<{ Params: { id: string } }>(
    "/api/personas/:id",
    async (request) => {
      const { id } = request.params;
      await db.delete(personas).where(eq(personas.id, id));
      return { ok: true };
    }
  );

  // Set default persona
  app.put<{ Params: { id: string } }>(
    "/api/personas/:id/set-default",
    async (request, reply) => {
      const { id } = request.params;

      // Clear all defaults
      await db.update(personas).set({ isDefault: 0 });
      // Set this one
      await db.update(personas).set({ isDefault: 1 }).where(eq(personas.id, id));

      const row = db.select().from(personas).where(eq(personas.id, id)).get();
      if (!row) return reply.status(404).send({ error: "Persona not found" });

      return { ...row, isDefault: true };
    }
  );

  // Duplicate persona
  app.post<{ Params: { id: string } }>(
    "/api/personas/:id/duplicate",
    async (request, reply) => {
      const { id } = request.params;
      const original = db
        .select()
        .from(personas)
        .where(eq(personas.id, id))
        .get();

      if (!original)
        return reply.status(404).send({ error: "Persona not found" });

      const newId = generateId();
      const now = new Date().toISOString();

      const record = {
        ...original,
        id: newId,
        name: `${original.name} (Copy)`,
        isDefault: 0,
        createdAt: now,
      };

      await db.insert(personas).values(record);
      return { ...record, isDefault: false };
    }
  );
}
