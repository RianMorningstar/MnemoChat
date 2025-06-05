import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { connectionProfiles } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function modelRoutes(app: FastifyInstance) {
  // Get available models from active Ollama connection
  app.get("/api/models", async () => {
    const active = db
      .select()
      .from(connectionProfiles)
      .where(eq(connectionProfiles.isActive, 1))
      .get();

    if (!active) return [];

    try {
      const res = await fetch(`${active.endpoint}/api/tags`);
      if (!res.ok) return [];

      const data = (await res.json()) as {
        models?: Array<{
          name: string;
          details?: { parameter_size?: string; family?: string };
        }>;
      };

      return (data.models || []).map((m) => ({
        id: m.name,
        name: m.name,
        contextLength: 4096,
      }));
    } catch {
      return [];
    }
  });
}
