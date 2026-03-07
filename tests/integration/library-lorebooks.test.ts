import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { characterRoutes } from "../../src/main/server/routes/characters";
import { libraryLorebookRoutes } from "../../src/main/server/routes/library-lorebooks";

describe("library lorebook routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await libraryLorebookRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/lorebooks returns [] initially", async () => {
    const res = await app.inject({ method: "GET", url: "/api/lorebooks" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/lorebooks creates a lorebook with defaults", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/lorebooks",
      payload: { name: "My Lorebook" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("My Lorebook");
    expect(typeof body.id).toBe("string");
    expect(Array.isArray(body.tags)).toBe(true);
    expect(body.entryCount).toBe(0);
    expect(body.attachedCharacterIds).toEqual([]);
    expect(body.attachedCharacterNames).toEqual([]);
  });

  it("GET /api/lorebooks reflects the created lorebook", async () => {
    const res = await app.inject({ method: "GET", url: "/api/lorebooks" });
    expect(res.json().length).toBeGreaterThan(0);
    expect(res.json()[0].name).toBe("My Lorebook");
  });

  it("DELETE /api/lorebooks/:id removes it", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/lorebooks",
      payload: { name: "ToDelete" },
    });
    const { id } = created.json();

    const del = await app.inject({ method: "DELETE", url: `/api/lorebooks/${id}` });
    expect(del.json().ok).toBe(true);

    const list = await app.inject({ method: "GET", url: "/api/lorebooks" });
    const ids = list.json().map((l: { id: string }) => l.id);
    expect(ids).not.toContain(id);
  });

  it("PUT /api/lorebooks/:id/attach sets attachedCharacterIds", async () => {
    const lbRes = await app.inject({
      method: "POST",
      url: "/api/lorebooks",
      payload: { name: "AttachTest" },
    });
    const lorebookId = lbRes.json().id;

    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Hero" },
    });
    const charId = charRes.json().id;

    await app.inject({
      method: "PUT",
      url: `/api/lorebooks/${lorebookId}/attach`,
      payload: { characterIds: [charId] },
    });

    const list = await app.inject({ method: "GET", url: "/api/lorebooks" });
    const lb = list.json().find((l: { id: string }) => l.id === lorebookId);
    expect(lb.attachedCharacterIds).toContain(charId);
    expect(lb.attachedCharacterNames).toContain("Hero");
  });

  it("POST /api/lorebooks/import with no entries returns 201 and entryCount 0", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/lorebooks/import",
      payload: { name: "Empty Import", tags: ["test"] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Empty Import");
    expect(body.entryCount).toBe(0);
    expect(body.tags).toEqual(["test"]);
    expect(body.attachedCharacterIds).toEqual([]);
  });

  it("POST /api/lorebooks/import with entries returns correct entryCount", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/lorebooks/import",
      payload: {
        name: "Two Entries",
        entries: [
          { keywords: ["dragon"], content: "Dragons breathe fire." },
          { keywords: ["castle"], content: "A castle on a hill." },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().entryCount).toBe(2);
  });

  it("POST /api/lorebooks/import uses correct defaults for entries", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/lorebooks/import",
      payload: {
        name: "Defaults Check",
        entries: [{ keywords: ["elf"], content: "Elves are graceful." }],
      },
    });
    expect(res.statusCode).toBe(201);
    const { id } = res.json();

    // Verify via export endpoint that entry fields have defaults
    const exportRes = await app.inject({
      method: "GET",
      url: `/api/lorebooks/${id}/export`,
    });
    expect(exportRes.statusCode).toBe(200);
    const exported = exportRes.json();
    expect(exported.entries).toHaveLength(1);
    const entry = exported.entries[0];
    expect(entry.keywords).toEqual(["elf"]);
    expect(entry.insertionPosition).toBe("before_character");
    expect(entry.priority).toBe(50);
    expect(entry.enabled).toBe(true);
  });

  it("POST /api/lorebooks/import preserves explicit entry values", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/lorebooks/import",
      payload: {
        name: "Explicit Values",
        entries: [
          {
            keywords: ["wizard"],
            content: "A wise wizard.",
            insertionPosition: "after_character",
            priority: 80,
            enabled: false,
          },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const { id } = res.json();

    const exportRes = await app.inject({
      method: "GET",
      url: `/api/lorebooks/${id}/export`,
    });
    const entry = exportRes.json().entries[0];
    expect(entry.insertionPosition).toBe("after_character");
    expect(entry.priority).toBe(80);
    expect(entry.enabled).toBe(false);
  });
});
