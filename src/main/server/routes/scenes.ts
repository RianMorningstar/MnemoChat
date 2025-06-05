import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import {
  scenes,
  contentBlocks,
  projects,
  chats,
  characters,
} from "../../db/schema";
import { eq, sql, asc } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function recalculateProjectCounts(projectId: string) {
  const allScenes = db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .all();

  let totalWords = 0;
  for (const scene of allScenes) {
    const blocks = db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.sceneId, scene.id))
      .all();

    const visibleBlocks = blocks.filter((b) => b.hidden === 0);
    const sceneWords = visibleBlocks.reduce(
      (sum, b) => sum + countWords(b.text ?? ""),
      0
    );

    db.update(scenes)
      .set({
        wordCount: sceneWords,
        blockCount: blocks.length,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scenes.id, scene.id))
      .run();

    totalWords += sceneWords;
  }

  db.update(projects)
    .set({
      wordCount: totalWords,
      sceneCount: allScenes.length,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, projectId))
    .run();
}

export async function sceneRoutes(app: FastifyInstance) {
  // List scenes for a project
  app.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/scenes",
    async (request) => {
      const { projectId } = request.params;

      const rows = db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, projectId))
        .orderBy(asc(scenes.position))
        .all();

      return rows.map((row) => {
        let sourceChatTitle: string | null = null;
        if (row.sourceChatId) {
          const chat = db
            .select({ title: chats.title })
            .from(chats)
            .where(eq(chats.id, row.sourceChatId))
            .get();
          sourceChatTitle = chat?.title ?? null;
        }

        return {
          ...row,
          sourceChatTitle,
          charactersPresent: [],
        };
      });
    }
  );

  // Create scene from bookmarks
  app.post<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/scenes",
    async (request) => {
      const { projectId } = request.params;
      const body = request.body as {
        title: string;
        sourceChatId?: string;
        contentBlocks?: Array<{
          bookmarkLabel: string;
          speaker: string;
          sourceMessageId: string;
          text: string;
        }>;
      };

      const now = new Date().toISOString();

      // Get next position
      const maxPos = db
        .select({ max: sql<number>`MAX(${scenes.position})` })
        .from(scenes)
        .where(eq(scenes.projectId, projectId))
        .get();
      const position = (maxPos?.max ?? 0) + 1;

      const sceneId = generateId();

      await db.insert(scenes).values({
        id: sceneId,
        projectId,
        title: body.title || "Untitled Scene",
        position,
        sourceChatId: body.sourceChatId ?? null,
        wordCount: 0,
        status: "draft",
        sceneNotes: "",
        blockCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Insert content blocks
      if (body.contentBlocks) {
        for (let i = 0; i < body.contentBlocks.length; i++) {
          const block = body.contentBlocks[i];
          await db.insert(contentBlocks).values({
            id: generateId(),
            sceneId,
            position: i + 1,
            bookmarkLabel: block.bookmarkLabel,
            speaker: block.speaker,
            hidden: 0,
            sourceMessageId: block.sourceMessageId,
            text: block.text,
          });
        }
      }

      recalculateProjectCounts(projectId);

      const scene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
      return {
        ...scene,
        sourceChatTitle: null,
        charactersPresent: [],
      };
    }
  );

  // Create placeholder scene
  app.post<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/scenes/placeholder",
    async (request) => {
      const { projectId } = request.params;
      const now = new Date().toISOString();

      const maxPos = db
        .select({ max: sql<number>`MAX(${scenes.position})` })
        .from(scenes)
        .where(eq(scenes.projectId, projectId))
        .get();
      const position = (maxPos?.max ?? 0) + 1;

      const sceneId = generateId();

      await db.insert(scenes).values({
        id: sceneId,
        projectId,
        title: `Scene ${position}`,
        position,
        sourceChatId: null,
        wordCount: 0,
        status: "placeholder",
        sceneNotes: "",
        blockCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      recalculateProjectCounts(projectId);

      const scene = db.select().from(scenes).where(eq(scenes.id, sceneId)).get();
      return {
        ...scene,
        sourceChatTitle: null,
        charactersPresent: [],
      };
    }
  );

  // Get single scene
  app.get<{ Params: { id: string } }>(
    "/api/scenes/:id",
    async (request, reply) => {
      const row = db
        .select()
        .from(scenes)
        .where(eq(scenes.id, request.params.id))
        .get();
      if (!row) return reply.status(404).send({ error: "Scene not found" });

      let sourceChatTitle: string | null = null;
      if (row.sourceChatId) {
        const chat = db
          .select({ title: chats.title })
          .from(chats)
          .where(eq(chats.id, row.sourceChatId))
          .get();
        sourceChatTitle = chat?.title ?? null;
      }

      // Compute characters present from block speakers
      const blocks = db
        .select({ speaker: contentBlocks.speaker })
        .from(contentBlocks)
        .where(eq(contentBlocks.sceneId, row.id))
        .all();

      const uniqueSpeakers = [...new Set(blocks.map((b) => b.speaker).filter(Boolean))];
      const charactersPresent = uniqueSpeakers.map((name) => {
        const char = db
          .select({ id: characters.id })
          .from(characters)
          .where(eq(characters.name, name ?? ""))
          .get();
        return {
          name: name ?? "",
          characterId: char?.id ?? "",
        };
      });

      return {
        ...row,
        sourceChatTitle,
        charactersPresent,
      };
    }
  );

  // Update scene
  app.put<{ Params: { id: string } }>(
    "/api/scenes/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      for (const field of ["title", "status", "sceneNotes"] as const) {
        if (field in body) updates[field] = body[field];
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      updates.updatedAt = new Date().toISOString();

      await db.update(scenes).set(updates).where(eq(scenes.id, id));

      const row = db.select().from(scenes).where(eq(scenes.id, id)).get();
      if (!row) return reply.status(404).send({ error: "Scene not found" });
      return { ...row, sourceChatTitle: null, charactersPresent: [] };
    }
  );

  // Delete scene
  app.delete<{ Params: { id: string } }>(
    "/api/scenes/:id",
    async (request) => {
      const { id } = request.params;
      const scene = db.select().from(scenes).where(eq(scenes.id, id)).get();
      if (!scene) return { ok: true };

      // Delete blocks
      await db.delete(contentBlocks).where(eq(contentBlocks.sceneId, id));

      // Delete scene
      await db.delete(scenes).where(eq(scenes.id, id));

      // Recompact positions
      const remaining = db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, scene.projectId))
        .orderBy(asc(scenes.position))
        .all();

      for (let i = 0; i < remaining.length; i++) {
        db.update(scenes)
          .set({ position: i + 1 })
          .where(eq(scenes.id, remaining[i].id))
          .run();
      }

      recalculateProjectCounts(scene.projectId);

      return { ok: true };
    }
  );

  // Reorder scenes
  app.put<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/scenes/reorder",
    async (request) => {
      const body = request.body as { sceneIds: string[] };

      for (let i = 0; i < body.sceneIds.length; i++) {
        db.update(scenes)
          .set({ position: i + 1, updatedAt: new Date().toISOString() })
          .where(eq(scenes.id, body.sceneIds[i]))
          .run();
      }

      return { ok: true };
    }
  );

  // Get content blocks for a scene
  app.get<{ Params: { id: string } }>(
    "/api/scenes/:id/blocks",
    async (request) => {
      const rows = db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.sceneId, request.params.id))
        .orderBy(asc(contentBlocks.position))
        .all();

      return rows.map((r) => ({
        ...r,
        hidden: r.hidden === 1,
      }));
    }
  );

  // Toggle block visibility
  app.put<{ Params: { id: string } }>(
    "/api/blocks/:id/visibility",
    async (request) => {
      const { id } = request.params;
      const block = db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.id, id))
        .get();
      if (!block) return { ok: false };

      const newHidden = block.hidden === 1 ? 0 : 1;
      await db
        .update(contentBlocks)
        .set({ hidden: newHidden })
        .where(eq(contentBlocks.id, id));

      // Recalculate counts
      const scene = db
        .select()
        .from(scenes)
        .where(eq(scenes.id, block.sceneId))
        .get();
      if (scene) {
        recalculateProjectCounts(scene.projectId);
      }

      return { ...block, hidden: newHidden === 1 };
    }
  );

  // Reorder blocks
  app.put<{ Params: { id: string } }>(
    "/api/scenes/:id/blocks/reorder",
    async (request) => {
      const body = request.body as { blockIds: string[] };

      for (let i = 0; i < body.blockIds.length; i++) {
        db.update(contentBlocks)
          .set({ position: i + 1 })
          .where(eq(contentBlocks.id, body.blockIds[i]))
          .run();
      }

      return { ok: true };
    }
  );

  // Add block to scene
  app.post<{ Params: { id: string } }>(
    "/api/scenes/:id/blocks",
    async (request) => {
      const { id } = request.params;
      const body = request.body as {
        bookmarkLabel: string;
        speaker: string;
        sourceMessageId: string;
        text: string;
      };

      const maxPos = db
        .select({ max: sql<number>`MAX(${contentBlocks.position})` })
        .from(contentBlocks)
        .where(eq(contentBlocks.sceneId, id))
        .get();
      const position = (maxPos?.max ?? 0) + 1;

      const blockId = generateId();

      await db.insert(contentBlocks).values({
        id: blockId,
        sceneId: id,
        position,
        bookmarkLabel: body.bookmarkLabel || "",
        speaker: body.speaker || "",
        hidden: 0,
        sourceMessageId: body.sourceMessageId || "",
        text: body.text || "",
      });

      // Recalculate
      const scene = db.select().from(scenes).where(eq(scenes.id, id)).get();
      if (scene) {
        recalculateProjectCounts(scene.projectId);
      }

      const block = db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.id, blockId))
        .get();

      return { ...block, hidden: false };
    }
  );
}
