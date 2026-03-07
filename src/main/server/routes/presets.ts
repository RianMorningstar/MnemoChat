import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { generationPresets } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

const defaultPresets = [
  {
    id: "preset-prose",
    name: "Prose",
    temperature: 1.0,
    repetitionPenalty: 1.1,
    topP: 0.95,
    topPEnabled: 1,
    topK: 40,
    topKEnabled: 0,
    maxNewTokens: 512,
    stopSequences: "[]",
    negativePrompt: "",
    guidanceScale: 1.0,
  },
  {
    id: "preset-spicy",
    name: "Spicy",
    temperature: 1.3,
    repetitionPenalty: 1.15,
    topP: 0.9,
    topPEnabled: 1,
    topK: 50,
    topKEnabled: 1,
    maxNewTokens: 768,
    stopSequences: "[]",
    negativePrompt: "",
    guidanceScale: 1.0,
  },
  {
    id: "preset-consistent",
    name: "Consistent",
    temperature: 0.7,
    repetitionPenalty: 1.05,
    topP: 0.85,
    topPEnabled: 1,
    topK: 30,
    topKEnabled: 0,
    maxNewTokens: 384,
    stopSequences: "[]",
    negativePrompt: "",
    guidanceScale: 1.0,
  },
];

function mapPreset(row: typeof generationPresets.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    temperature: row.temperature ?? 1.0,
    repetitionPenalty: row.repetitionPenalty ?? 1.1,
    topP: row.topP ?? 0.95,
    topPEnabled: row.topPEnabled === 1,
    topK: row.topK ?? 40,
    topKEnabled: row.topKEnabled === 1,
    maxNewTokens: row.maxNewTokens ?? 512,
    stopSequences: JSON.parse((row.stopSequences as string) || "[]"),
    negativePrompt: row.negativePrompt ?? "",
    guidanceScale: row.guidanceScale ?? 1.0,
  };
}

function seedDefaults() {
  const count = db
    .select({ count: sql<number>`count(*)` })
    .from(generationPresets)
    .get();

  if ((count?.count || 0) === 0) {
    for (const p of defaultPresets) {
      db.insert(generationPresets).values(p).run();
    }
  }
}

export async function presetRoutes(app: FastifyInstance) {
  // List all presets (seed defaults if empty)
  app.get("/api/presets", async () => {
    seedDefaults();
    const rows = db.select().from(generationPresets).all();
    return rows.map(mapPreset);
  });

  // Create preset
  app.post("/api/presets", async (request) => {
    const body = request.body as Record<string, unknown>;
    const id = generateId();

    const record = {
      id,
      name: (body.name as string) || "New Preset",
      temperature: (body.temperature as number) ?? 1.0,
      repetitionPenalty: (body.repetitionPenalty as number) ?? 1.1,
      topP: (body.topP as number) ?? 0.95,
      topPEnabled: body.topPEnabled ? 1 : 0,
      topK: (body.topK as number) ?? 40,
      topKEnabled: body.topKEnabled ? 1 : 0,
      maxNewTokens: (body.maxNewTokens as number) ?? 512,
      stopSequences: JSON.stringify(body.stopSequences || []),
      negativePrompt: (body.negativePrompt as string) ?? "",
      guidanceScale: (body.guidanceScale as number) ?? 1.0,
    };

    db.insert(generationPresets).values(record).run();

    return mapPreset(db.select().from(generationPresets).where(eq(generationPresets.id, id)).get()!);
  });

  // Update preset
  app.put<{ Params: { id: string } }>("/api/presets/:id", async (request, reply) => {
    const { id } = request.params;
    const body = request.body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("name" in body) updates.name = body.name;
    if ("temperature" in body) updates.temperature = body.temperature;
    if ("repetitionPenalty" in body) updates.repetitionPenalty = body.repetitionPenalty;
    if ("topP" in body) updates.topP = body.topP;
    if ("topPEnabled" in body) updates.topPEnabled = body.topPEnabled ? 1 : 0;
    if ("topK" in body) updates.topK = body.topK;
    if ("topKEnabled" in body) updates.topKEnabled = body.topKEnabled ? 1 : 0;
    if ("maxNewTokens" in body) updates.maxNewTokens = body.maxNewTokens;
    if ("stopSequences" in body) updates.stopSequences = JSON.stringify(body.stopSequences);
    if ("negativePrompt" in body) updates.negativePrompt = body.negativePrompt;
    if ("guidanceScale" in body) updates.guidanceScale = body.guidanceScale;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ error: "No fields to update" });
    }

    db.update(generationPresets).set(updates).where(eq(generationPresets.id, id)).run();

    const row = db.select().from(generationPresets).where(eq(generationPresets.id, id)).get();
    if (!row) return reply.status(404).send({ error: "Preset not found" });

    return mapPreset(row);
  });

  // Delete preset
  app.delete<{ Params: { id: string } }>("/api/presets/:id", async (request) => {
    const { id } = request.params;
    db.delete(generationPresets).where(eq(generationPresets.id, id)).run();
    return { ok: true };
  });
}
