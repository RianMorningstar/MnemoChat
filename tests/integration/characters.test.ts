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

describe("character routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/characters returns an array", async () => {
    const res = await app.inject({ method: "GET", url: "/api/characters" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("GET /api/characters/:id returns 404 for a missing id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/characters/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/characters creates a character with correct defaults", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Test Hero", description: "A brave hero" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Test Hero");
    expect(body.description).toBe("A brave hero");
    expect(Array.isArray(body.tags)).toBe(true);
    expect(Array.isArray(body.alternateGreetings)).toBe(true);
    expect(Array.isArray(body.exampleDialogues)).toBe(true);
    expect(body.lorebookEntryCount).toBe(0);
    expect(typeof body.id).toBe("string");
  });

  it("GET /api/characters/:id retrieves a created character", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Findable Character" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Findable Character");
  });

  it("PUT /api/characters/:id updates fields", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Original Name" },
    });
    const { id } = created.json();

    const updated = await app.inject({
      method: "PUT",
      url: `/api/characters/${id}`,
      payload: { name: "Updated Name", personality: "Friendly" },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().name).toBe("Updated Name");
    expect(updated.json().personality).toBe("Friendly");
  });

  it("DELETE /api/characters/:id removes the character", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "ToDelete" },
    });
    const { id } = created.json();

    const del = await app.inject({
      method: "DELETE",
      url: `/api/characters/${id}`,
    });
    expect(del.json().ok).toBe(true);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/characters/${id}`,
    });
    expect(fetched.statusCode).toBe(404);
  });

  it("POST /api/characters serializes tags array correctly", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Tagged", tags: ["hero", "fantasy"] },
    });
    expect(res.json().tags).toEqual(["hero", "fantasy"]);
  });

  it("POST /api/characters/:id/duplicate creates a copy", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "Original" },
    });
    const { id } = created.json();

    const duped = await app.inject({
      method: "POST",
      url: `/api/characters/${id}/duplicate`,
    });
    expect(duped.statusCode).toBe(200);
    expect(duped.json().name).toBe("Original (Copy)");
    expect(duped.json().id).not.toBe(id);
  });
});

describe("character-lorebook attachment routes", () => {
  let app: FastifyInstance;
  let charId: string;
  let lorebookId: string;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await libraryLorebookRoutes(app);
    await app.ready();

    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "AttachChar" },
    });
    charId = charRes.json().id;

    const lbRes = await app.inject({
      method: "POST",
      url: "/api/lorebooks",
      payload: { name: "TestLorebook", tags: ["fantasy"] },
    });
    lorebookId = lbRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/characters/:id/lorebooks returns [] initially", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebooks`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/characters/:id/lorebooks/:lorebookId attaches a lorebook", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebooks/${lorebookId}`,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().ok).toBe(true);
  });

  it("GET /api/characters/:id/lorebooks returns the attached lorebook", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebooks`,
    });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(lorebookId);
    expect(list[0].name).toBe("TestLorebook");
    expect(Array.isArray(list[0].tags)).toBe(true);
  });

  it("POST same pair twice is idempotent (still one attachment)", async () => {
    await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebooks/${lorebookId}`,
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebooks`,
    });
    expect(res.json()).toHaveLength(1);
  });

  it("DELETE /api/characters/:id/lorebooks/:lorebookId detaches", async () => {
    const del = await app.inject({
      method: "DELETE",
      url: `/api/characters/${charId}/lorebooks/${lorebookId}`,
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().ok).toBe(true);

    const list = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebooks`,
    });
    expect(list.json()).toEqual([]);
  });
});
