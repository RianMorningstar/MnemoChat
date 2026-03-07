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
import { lorebookRoutes } from "../../src/main/server/routes/lorebook";

describe("lorebook routes", () => {
  let app: FastifyInstance;
  let charId: string;

  beforeAll(async () => {
    app = Fastify();
    await characterRoutes(app);
    await lorebookRoutes(app);
    await app.ready();

    const charRes = await app.inject({
      method: "POST",
      url: "/api/characters",
      payload: { name: "LoreChar" },
    });
    charId = charRes.json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/characters/:characterId/lorebook returns empty array initially", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebook`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST creates a lorebook entry with keyword array", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: {
        keywords: ["dragon", "fire"],
        content: "Dragons breathe fire.",
        priority: 75,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.keywords).toEqual(["dragon", "fire"]);
    expect(body.content).toBe("Dragons breathe fire.");
    expect(body.priority).toBe(75);
    expect(body.enabled).toBe(true);
    expect(body.insertionPosition).toBe("before_character");
  });

  it("GET returns entries with parsed keywords (not JSON string)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebook`,
    });
    const entries = res.json();
    expect(entries.length).toBeGreaterThan(0);
    expect(Array.isArray(entries[0].keywords)).toBe(true);
  });

  it("PUT /api/lorebook/:id updates content and priority", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: { keywords: ["castle"], content: "Old content", priority: 50 },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/lorebook/${id}`,
      payload: { content: "Updated content", priority: 90 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().content).toBe("Updated content");
    expect(res.json().priority).toBe(90);
  });

  it("PUT /api/lorebook/:id/toggle flips enabled from true to false", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: { keywords: ["toggle-test"], content: "Toggle me" },
    });
    const { id } = created.json();
    expect(created.json().enabled).toBe(true);

    const res = await app.inject({
      method: "PUT",
      url: `/api/lorebook/${id}/toggle`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().enabled).toBe(false);
  });

  it("PUT /api/lorebook/:id/toggle flips enabled from false back to true", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: { keywords: ["double-toggle"], content: "Toggle twice" },
    });
    const { id } = created.json();

    await app.inject({ method: "PUT", url: `/api/lorebook/${id}/toggle` }); // now false
    const res = await app.inject({ method: "PUT", url: `/api/lorebook/${id}/toggle` }); // back to true
    expect(res.json().enabled).toBe(true);
  });

  it("DELETE /api/lorebook/:id removes the entry", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: { keywords: ["deleteme"], content: "Gone soon" },
    });
    const { id } = created.json();

    const del = await app.inject({ method: "DELETE", url: `/api/lorebook/${id}` });
    expect(del.json().ok).toBe(true);

    const list = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebook`,
    });
    const ids = list.json().map((e: { id: string }) => e.id);
    expect(ids).not.toContain(id);
  });

  it("PUT /api/lorebook/:id/toggle returns 404 for missing entry", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/lorebook/does-not-exist/toggle",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST creates entry with default logic, probability, and scanDepth", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: { keywords: ["defaults-test"], content: "Defaults check" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.logic).toBe("AND_ANY");
    expect(body.probability).toBe(100);
    expect(body.scanDepth).toBe(0);
  });

  it("POST respects explicit logic, probability, and scanDepth values", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: {
        keywords: ["explicit-test"],
        content: "Explicit values",
        logic: "AND_ALL",
        probability: 75,
        scanDepth: 5,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.logic).toBe("AND_ALL");
    expect(body.probability).toBe(75);
    expect(body.scanDepth).toBe(5);
  });

  it("PUT updates logic, probability, and scanDepth", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/api/characters/${charId}/lorebook`,
      payload: { keywords: ["update-advanced"], content: "To update" },
    });
    const { id } = created.json();

    const res = await app.inject({
      method: "PUT",
      url: `/api/lorebook/${id}`,
      payload: { logic: "NOT_ANY", probability: 50, scanDepth: 3 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.logic).toBe("NOT_ANY");
    expect(body.probability).toBe(50);
    expect(body.scanDepth).toBe(3);
  });

  it("GET returns new fields for existing entries", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/characters/${charId}/lorebook`,
    });
    const entries = res.json();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(typeof entry.logic).toBe("string");
      expect(typeof entry.probability).toBe("number");
      expect(typeof entry.scanDepth).toBe("number");
    }
  });
});
