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
import { collectionRoutes } from "../../src/main/server/routes/collections";

describe("collection routes", () => {
  let app: FastifyInstance;
  let charId: string;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await collectionRoutes(app);
    await app.ready();

    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "CollChar" },
    });
    charId = charRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/collections returns empty array initially", async () => {
    const res = await app.inject({ method: "GET", url: "/api/collections" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/collections creates collection with correct defaults", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/collections",
      payload: { name: "Favorites" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Favorites");
    expect(body.memberCount).toBe(0);
    expect(body.description).toBe("");
    expect(body.sortOrder).toBe(0);
    expect(typeof body.id).toBe("string");
  });

  it("PUT /api/collections/:id updates name and description", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/collections",
      payload: { name: "Old Name" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/collections/${id}`,
      payload: { name: "New Name", description: "My collection" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("New Name");
    expect(res.json().description).toBe("My collection");
  });

  it("POST /api/collections/:id/characters adds a character (memberCount becomes 1)", async () => {
    const coll = await app.inject({
      method: "POST",
      url: "/api/collections",
      payload: { name: "With Members" },
    });
    const { id: collId } = coll.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/collections/${collId}/characters`,
      payload: { characterIds: [charId] },
    });
    expect(res.statusCode).toBe(200);

    const list = await app.inject({ method: "GET", url: "/api/collections" });
    const found = list.json().find((c: { id: string }) => c.id === collId);
    expect(found.memberCount).toBe(1);
  });

  it("Adding the same character twice is idempotent (memberCount stays 1)", async () => {
    const coll = await app.inject({
      method: "POST",
      url: "/api/collections",
      payload: { name: "Idempotent" },
    });
    const { id: collId } = coll.json();

    await app.inject({
      method: "POST",
      url: `/api/collections/${collId}/characters`,
      payload: { characterIds: [charId] },
    });
    await app.inject({
      method: "POST",
      url: `/api/collections/${collId}/characters`,
      payload: { characterIds: [charId] },
    });

    const list = await app.inject({ method: "GET", url: "/api/collections" });
    const found = list.json().find((c: { id: string }) => c.id === collId);
    expect(found.memberCount).toBe(1);
  });

  it("DELETE /api/collections/:id/characters/:characterId removes character (memberCount back to 0)", async () => {
    const coll = await app.inject({
      method: "POST",
      url: "/api/collections",
      payload: { name: "RemoveChar" },
    });
    const { id: collId } = coll.json();

    await app.inject({
      method: "POST",
      url: `/api/collections/${collId}/characters`,
      payload: { characterIds: [charId] },
    });

    const del = await app.inject({
      method: "DELETE",
      url: `/api/collections/${collId}/characters/${charId}`,
    });
    expect(del.json().ok).toBe(true);

    const list = await app.inject({ method: "GET", url: "/api/collections" });
    const found = list.json().find((c: { id: string }) => c.id === collId);
    expect(found.memberCount).toBe(0);
  });

  it("DELETE /api/collections/:id removes collection but leaves character intact", async () => {
    const coll = await app.inject({
      method: "POST",
      url: "/api/collections",
      payload: { name: "ToDelete" },
    });
    const { id: collId } = coll.json();

    await app.inject({
      method: "POST",
      url: `/api/collections/${collId}/characters`,
      payload: { characterIds: [charId] },
    });

    const del = await app.inject({
      method: "DELETE",
      url: `/api/collections/${collId}`,
    });
    expect(del.json().ok).toBe(true);

    // Collection gone
    const list = await app.inject({ method: "GET", url: "/api/collections" });
    const ids = list.json().map((c: { id: string }) => c.id);
    expect(ids).not.toContain(collId);

    // Character still exists
    const charRes = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}`,
    });
    expect(charRes.statusCode).toBe(200);
  });
});
