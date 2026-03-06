import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { personaRoutes } from "../../src/main/server/routes/personas";

describe("persona routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await personaRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/personas returns empty array initially", async () => {
    const res = await app.inject({ method: "GET", url: "/api/personas" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/personas creates persona with defaults", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "Alice" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Alice");
    expect(body.isDefault).toBe(false);
    expect(body.description).toBe("");
    expect(body.avatarUrl).toBe("");
    expect(typeof body.id).toBe("string");
  });

  it("GET /api/personas/:id returns 404 for missing id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/personas/does-not-exist",
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/personas/:id retrieves a created persona", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "Bob" },
    });
    const { id } = created.json();

    const res = await app.inject({ method: "GET", url: `/api/personas/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Bob");
  });

  it("PUT /api/personas/:id updates name and description", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "OldName" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/personas/${id}`,
      payload: { name: "NewName", description: "A writer" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("NewName");
    expect(res.json().description).toBe("A writer");
  });

  it("PUT /api/personas/:id/set-default sets one persona as default", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "DefaultPerson" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/personas/${id}/set-default`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isDefault).toBe(true);
  });

  it("set-default clears previous default when a new one is set", async () => {
    const p1 = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "First" },
    });
    const { id: id1 } = p1.json();

    const p2 = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "Second" },
    });
    const { id: id2 } = p2.json();

    await app.inject({ method: "PUT", url: `/api/personas/${id1}/set-default` });
    await app.inject({ method: "PUT", url: `/api/personas/${id2}/set-default` });

    const r1 = await app.inject({ method: "GET", url: `/api/personas/${id1}` });
    const r2 = await app.inject({ method: "GET", url: `/api/personas/${id2}` });
    expect(r1.json().isDefault).toBe(false);
    expect(r2.json().isDefault).toBe(true);
  });

  it("POST /api/personas/:id/duplicate creates copy with '(Copy)' suffix", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "Original" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "POST",
      url: `/api/personas/${id}/duplicate`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Original (Copy)");
    expect(res.json().id).not.toBe(id);
    expect(res.json().isDefault).toBe(false);
  });

  it("DELETE /api/personas/:id removes persona", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/personas",
      payload: { name: "ToDelete" },
    });
    const { id } = created.json();

    const del = await app.inject({ method: "DELETE", url: `/api/personas/${id}` });
    expect(del.json().ok).toBe(true);

    const fetched = await app.inject({ method: "GET", url: `/api/personas/${id}` });
    expect(fetched.statusCode).toBe(404);
  });
});
