import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { connectionRoutes } from "../../src/main/server/routes/connections";

describe("connections routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await connectionRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── CRUD basics ────────────────────────────────────────────────────────────

  it("GET /api/connections returns empty array initially", async () => {
    const res = await app.inject({ method: "GET", url: "/api/connections" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST creates a connection with default ollama type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/connections",
      payload: { id: "c1", name: "Local", endpoint: "http://localhost:11434" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe("ollama");
    expect(body.apiKey).toBeNull();
  });

  it("GET returns the created connection", async () => {
    const res = await app.inject({ method: "GET", url: "/api/connections" });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].name).toBe("Local");
  });

  it("DELETE removes the connection", async () => {
    await app.inject({ method: "DELETE", url: "/api/connections/c1" });
    const res = await app.inject({ method: "GET", url: "/api/connections" });
    expect(res.json()).toHaveLength(0);
  });

  // ── Provider type field ────────────────────────────────────────────────────

  it("POST stores a non-ollama provider type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/connections",
      payload: {
        id: "c2",
        name: "OpenAI",
        type: "openai",
        endpoint: "https://api.openai.com",
        apiKey: "sk-test",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe("openai");
    expect(body.apiKey).toBe("sk-test");
  });

  it("GET returns correct type and apiKey for cloud provider", async () => {
    const res = await app.inject({ method: "GET", url: "/api/connections" });
    const profile = res.json().find((p: { id: string }) => p.id === "c2");
    expect(profile).toBeDefined();
    expect(profile.type).toBe("openai");
    expect(profile.apiKey).toBe("sk-test");
  });

  it("PUT updates type and apiKey", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/connections/c2",
      payload: { type: "groq", apiKey: "gsk-new" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe("groq");
    expect(body.apiKey).toBe("gsk-new");
  });

  it("PUT updates endpoint without touching type or apiKey", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/connections/c2",
      payload: { endpoint: "https://api.groq.com/openai" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.endpoint).toBe("https://api.groq.com/openai");
    expect(body.type).toBe("groq");
    expect(body.apiKey).toBe("gsk-new");
  });

  it("PUT with no valid fields returns 400", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/connections/c2",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  // ── Anthropic provider ─────────────────────────────────────────────────────

  it("POST stores anthropic provider with api key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/connections",
      payload: {
        id: "c3",
        name: "Anthropic",
        type: "anthropic",
        endpoint: "https://api.anthropic.com",
        apiKey: "ant-key-abc",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().type).toBe("anthropic");
    expect(res.json().apiKey).toBe("ant-key-abc");
  });

  // ── Activate ───────────────────────────────────────────────────────────────

  it("PUT /activate sets isActive on the target and deactivates others", async () => {
    // Activate c2
    await app.inject({ method: "PUT", url: "/api/connections/c2/activate" });
    // Activate c3 — should deactivate c2
    await app.inject({ method: "PUT", url: "/api/connections/c3/activate" });

    const res = await app.inject({ method: "GET", url: "/api/connections" });
    const profiles = res.json() as Array<{ id: string; isActive: number }>;
    const c2 = profiles.find((p) => p.id === "c2");
    const c3 = profiles.find((p) => p.id === "c3");
    expect(c2?.isActive).toBe(0);
    expect(c3?.isActive).toBe(1);
  });

  // ── LM Studio (local, no api key) ─────────────────────────────────────────

  it("POST stores lm-studio provider without api key", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/connections",
      payload: {
        id: "c4",
        name: "LM Studio",
        type: "lm-studio",
        endpoint: "http://localhost:1234",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().type).toBe("lm-studio");
    expect(res.json().apiKey).toBeNull();
  });
});
