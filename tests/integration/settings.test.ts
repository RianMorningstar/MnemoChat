import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
}));

vi.mock("@main/db", async () => {
  const { createTestDb } = await import("../helpers/db");
  return { db: createTestDb() };
});

import Fastify, { type FastifyInstance } from "fastify";
import { settingsRoutes } from "../../src/main/server/routes/settings";

describe("settings routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await settingsRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/settings/:key returns 404 for a missing key", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/settings/nonexistent",
    });
    expect(res.statusCode).toBe(404);
  });

  it("PUT then GET round-trips a setting value", async () => {
    await app.inject({
      method: "PUT",
      url: "/api/settings/theme",
      payload: { value: "dark" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/settings/theme",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().value).toBe("dark");
  });

  it("PUT overwrites an existing value", async () => {
    await app.inject({
      method: "PUT",
      url: "/api/settings/lang",
      payload: { value: "en" },
    });
    await app.inject({
      method: "PUT",
      url: "/api/settings/lang",
      payload: { value: "fr" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/settings/lang",
    });
    expect(res.json().value).toBe("fr");
  });

  it("GET returns the key in the response body", async () => {
    await app.inject({
      method: "PUT",
      url: "/api/settings/myKey",
      payload: { value: "myValue" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/settings/myKey",
    });
    expect(res.json().key).toBe("myKey");
  });
});
