import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import { sceneDirections } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function sceneDirectionRoutes(app: FastifyInstance) {
  // Get scene direction for a chat
  app.get<{ Params: { chatId: string } }>("/api/chats/:chatId/scene-direction", async (request) => {
    const { chatId } = request.params;
    const row = db
      .select()
      .from(sceneDirections)
      .where(eq(sceneDirections.chatId, chatId))
      .get();

    if (!row) {
      return { text: "", injectionDepth: 4, enabled: false, tokenCount: 0 };
    }

    return {
      text: row.text,
      injectionDepth: row.injectionDepth,
      enabled: row.enabled === 1,
      tokenCount: row.tokenCount,
    };
  });

  // Update scene direction
  app.put<{ Params: { chatId: string } }>("/api/chats/:chatId/scene-direction", async (request) => {
    const { chatId } = request.params;
    const body = request.body as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    if ("text" in body) {
      updates.text = body.text;
      updates.tokenCount = Math.ceil(((body.text as string) || "").length / 4);
    }
    if ("injectionDepth" in body) updates.injectionDepth = body.injectionDepth;
    if ("enabled" in body) updates.enabled = body.enabled ? 1 : 0;

    db.update(sceneDirections)
      .set(updates)
      .where(eq(sceneDirections.chatId, chatId))
      .run();

    const row = db
      .select()
      .from(sceneDirections)
      .where(eq(sceneDirections.chatId, chatId))
      .get();

    return {
      text: row?.text || "",
      injectionDepth: row?.injectionDepth || 4,
      enabled: row?.enabled === 1,
      tokenCount: row?.tokenCount || 0,
    };
  });
}
