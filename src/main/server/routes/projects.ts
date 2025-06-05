import type { FastifyInstance } from "fastify";
import { db } from "../../db";
import {
  projects,
  scenes,
  contentBlocks,
  projectCharacters,
  projectLorebooks,
  characters,
  lorebooks,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

function generateId(): string {
  return crypto.randomUUID();
}

function getProjectWithJoins(id: string) {
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) return null;

  const charRows = db
    .select({
      characterId: projectCharacters.characterId,
      name: characters.name,
    })
    .from(projectCharacters)
    .leftJoin(characters, eq(projectCharacters.characterId, characters.id))
    .where(eq(projectCharacters.projectId, id))
    .all();

  const lbRows = db
    .select({
      lorebookId: projectLorebooks.lorebookId,
      name: lorebooks.name,
    })
    .from(projectLorebooks)
    .leftJoin(lorebooks, eq(projectLorebooks.lorebookId, lorebooks.id))
    .where(eq(projectLorebooks.projectId, id))
    .all();

  const sceneRows = db
    .select({ id: scenes.id })
    .from(scenes)
    .where(eq(scenes.projectId, id))
    .all();

  return {
    ...row,
    characterIds: charRows.map((r) => r.characterId),
    characterNames: charRows.map((r) => r.name ?? "Unknown"),
    lorebookIds: lbRows.map((r) => r.lorebookId),
    lorebookNames: lbRows.map((r) => r.name ?? "Unknown"),
    sceneIds: sceneRows.map((r) => r.id),
  };
}

export async function projectRoutes(app: FastifyInstance) {
  // List all projects
  app.get("/api/projects", async () => {
    const rows = db.select().from(projects).all();

    return rows.map((row) => {
      const charRows = db
        .select({
          characterId: projectCharacters.characterId,
          name: characters.name,
        })
        .from(projectCharacters)
        .leftJoin(characters, eq(projectCharacters.characterId, characters.id))
        .where(eq(projectCharacters.projectId, row.id))
        .all();

      const lbRows = db
        .select({
          lorebookId: projectLorebooks.lorebookId,
          name: lorebooks.name,
        })
        .from(projectLorebooks)
        .leftJoin(lorebooks, eq(projectLorebooks.lorebookId, lorebooks.id))
        .where(eq(projectLorebooks.projectId, row.id))
        .all();

      const sceneRows = db
        .select({ id: scenes.id })
        .from(scenes)
        .where(eq(scenes.projectId, row.id))
        .all();

      return {
        ...row,
        characterIds: charRows.map((r) => r.characterId),
        characterNames: charRows.map((r) => r.name ?? "Unknown"),
        lorebookIds: lbRows.map((r) => r.lorebookId),
        lorebookNames: lbRows.map((r) => r.name ?? "Unknown"),
        sceneIds: sceneRows.map((r) => r.id),
      };
    });
  });

  // Get single project
  app.get<{ Params: { id: string } }>(
    "/api/projects/:id",
    async (request, reply) => {
      const project = getProjectWithJoins(request.params.id);
      if (!project) return reply.status(404).send({ error: "Project not found" });
      return project;
    }
  );

  // Create project
  app.post("/api/projects", async (request) => {
    const body = request.body as Record<string, unknown>;
    const now = new Date().toISOString();
    const id = generateId();

    const record = {
      id,
      title: (body.title as string) || "Untitled Project",
      description: (body.description as string) || "",
      status: "drafting",
      coverImage: null,
      createdAt: now,
      updatedAt: now,
      wordCount: 0,
      sceneCount: 0,
    };

    await db.insert(projects).values(record);
    return {
      ...record,
      characterIds: [],
      characterNames: [],
      lorebookIds: [],
      lorebookNames: [],
      sceneIds: [],
    };
  });

  // Update project
  app.put<{ Params: { id: string } }>(
    "/api/projects/:id",
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as Record<string, unknown>;

      const updates: Record<string, unknown> = {};
      for (const field of ["title", "description", "status", "coverImage"] as const) {
        if (field in body) updates[field] = body[field];
      }

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      updates.updatedAt = new Date().toISOString();

      await db.update(projects).set(updates).where(eq(projects.id, id));

      const project = getProjectWithJoins(id);
      if (!project) return reply.status(404).send({ error: "Project not found" });
      return project;
    }
  );

  // Delete project (cascade)
  app.delete<{ Params: { id: string } }>(
    "/api/projects/:id",
    async (request) => {
      const { id } = request.params;

      // Get all scenes for this project
      const sceneRows = db
        .select({ id: scenes.id })
        .from(scenes)
        .where(eq(scenes.projectId, id))
        .all();

      // Delete content blocks for each scene
      for (const scene of sceneRows) {
        await db.delete(contentBlocks).where(eq(contentBlocks.sceneId, scene.id));
      }

      // Delete scenes
      await db.delete(scenes).where(eq(scenes.projectId, id));

      // Delete junctions
      await db.delete(projectCharacters).where(eq(projectCharacters.projectId, id));
      await db.delete(projectLorebooks).where(eq(projectLorebooks.projectId, id));

      // Delete project
      await db.delete(projects).where(eq(projects.id, id));

      return { ok: true };
    }
  );

  // Add characters to project
  app.post<{ Params: { id: string } }>(
    "/api/projects/:id/characters",
    async (request) => {
      const { id } = request.params;
      const body = request.body as { characterIds: string[] };

      for (const characterId of body.characterIds) {
        await db
          .insert(projectCharacters)
          .values({ projectId: id, characterId })
          .onConflictDoNothing();
      }

      await db
        .update(projects)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id));

      return { ok: true };
    }
  );

  // Remove character from project
  app.delete<{ Params: { id: string; characterId: string } }>(
    "/api/projects/:id/characters/:characterId",
    async (request) => {
      const { id, characterId } = request.params;
      await db
        .delete(projectCharacters)
        .where(
          sql`${projectCharacters.projectId} = ${id} AND ${projectCharacters.characterId} = ${characterId}`
        );

      await db
        .update(projects)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id));

      return { ok: true };
    }
  );

  // Add lorebooks to project
  app.post<{ Params: { id: string } }>(
    "/api/projects/:id/lorebooks",
    async (request) => {
      const { id } = request.params;
      const body = request.body as { lorebookIds: string[] };

      for (const lorebookId of body.lorebookIds) {
        await db
          .insert(projectLorebooks)
          .values({ projectId: id, lorebookId })
          .onConflictDoNothing();
      }

      await db
        .update(projects)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id));

      return { ok: true };
    }
  );

  // Remove lorebook from project
  app.delete<{ Params: { id: string; lorebookId: string } }>(
    "/api/projects/:id/lorebooks/:lorebookId",
    async (request) => {
      const { id, lorebookId } = request.params;
      await db
        .delete(projectLorebooks)
        .where(
          sql`${projectLorebooks.projectId} = ${id} AND ${projectLorebooks.lorebookId} = ${lorebookId}`
        );

      await db
        .update(projects)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id));

      return { ok: true };
    }
  );
}
