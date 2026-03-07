import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { presetRoutes } from "../../src/main/server/routes/presets";

describe("preset routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await presetRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/presets auto-seeds 3 built-in presets on first call", async () => {
    const res = await app.inject({ method: "GET", url: "/api/presets" });
    expect(res.statusCode).toBe(200);
    const presets = res.json();
    expect(presets.length).toBe(3);
    const names = presets.map((p: { name: string }) => p.name);
    expect(names).toContain("Prose");
    expect(names).toContain("Spicy");
    expect(names).toContain("Consistent");
  });

  it("GET /api/presets on already-seeded DB does NOT duplicate presets", async () => {
    // Call again — should still be 3 (or 3 + any we create later in these tests)
    const res = await app.inject({ method: "GET", url: "/api/presets" });
    const presets = res.json();
    const names = presets.map((p: { name: string }) => p.name);
    const prooseCount = names.filter((n: string) => n === "Prose").length;
    expect(prooseCount).toBe(1);
  });

  it("GET returns booleans for topPEnabled and topKEnabled", async () => {
    const res = await app.inject({ method: "GET", url: "/api/presets" });
    const prose = res.json().find((p: { name: string }) => p.name === "Prose");
    expect(typeof prose.topPEnabled).toBe("boolean");
    expect(typeof prose.topKEnabled).toBe("boolean");
    expect(prose.topPEnabled).toBe(true);
    expect(prose.topKEnabled).toBe(false);
  });

  it("GET returns stopSequences as a parsed array", async () => {
    const res = await app.inject({ method: "GET", url: "/api/presets" });
    const prose = res.json().find((p: { name: string }) => p.name === "Prose");
    expect(Array.isArray(prose.stopSequences)).toBe(true);
  });

  it("POST /api/presets creates a custom preset", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: {
        name: "My Preset",
        temperature: 0.8,
        topPEnabled: true,
        stopSequences: ["###", "---"],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("My Preset");
    expect(body.temperature).toBe(0.8);
    expect(body.topPEnabled).toBe(true);
    expect(body.stopSequences).toEqual(["###", "---"]);
  });

  it("PUT /api/presets/:id updates temperature", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: { name: "Updatable" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/presets/${id}`,
      payload: { temperature: 0.5 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().temperature).toBe(0.5);
  });

  it("PUT /api/presets/:id with no fields returns 400", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: { name: "NoUpdate" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/presets/${id}`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET returns negativePrompt and guidanceScale with defaults", async () => {
    const res = await app.inject({ method: "GET", url: "/api/presets" });
    const prose = res.json().find((p: { name: string }) => p.name === "Prose");
    expect(prose.negativePrompt).toBe("");
    expect(prose.guidanceScale).toBe(1.0);
  });

  it("POST /api/presets persists negativePrompt and guidanceScale", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: {
        name: "CFG Preset",
        negativePrompt: "avoid violence and gore",
        guidanceScale: 1.5,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.negativePrompt).toBe("avoid violence and gore");
    expect(body.guidanceScale).toBe(1.5);
  });

  it("PUT /api/presets/:id updates negativePrompt and guidanceScale", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: { name: "CFG Update Test" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/presets/${id}`,
      payload: { negativePrompt: "no profanity", guidanceScale: 2.0 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().negativePrompt).toBe("no profanity");
    expect(res.json().guidanceScale).toBe(2.0);
  });

  it("POST /api/presets defaults negativePrompt to empty and guidanceScale to 1.0", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: { name: "No CFG Fields" },
    });
    const body = res.json();
    expect(body.negativePrompt).toBe("");
    expect(body.guidanceScale).toBe(1.0);
  });

  it("DELETE /api/presets/:id removes a preset", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/presets",
      payload: { name: "DeleteMe" },
    });
    const { id } = created.json();

    const del = await app.inject({ method: "DELETE", url: `/api/presets/${id}` });
    expect(del.json().ok).toBe(true);

    const list = await app.inject({ method: "GET", url: "/api/presets" });
    const ids = list.json().map((p: { id: string }) => p.id);
    expect(ids).not.toContain(id);
  });
});
