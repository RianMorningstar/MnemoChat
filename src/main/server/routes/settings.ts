import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { appSettings } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function settingsRoutes(app: FastifyInstance) {
  app.get<{ Params: { key: string } }>(
    "/api/settings/:key",
    async (request, reply) => {
      const { key } = request.params;
      const row = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .get();
      if (!row) {
        return reply.status(404).send({ error: "Setting not found" });
      }
      return row;
    }
  );

  app.put<{ Params: { key: string }; Body: { value: string } }>(
    "/api/settings/:key",
    async (request, reply) => {
      const { key } = request.params;
      const { value } = request.body as { value: string };
      const now = new Date().toISOString();
      await db
        .insert(appSettings)
        .values({ key, value, updatedAt: now })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: { value, updatedAt: now },
        });
      return { key, value, updatedAt: now };
    }
  );
}
