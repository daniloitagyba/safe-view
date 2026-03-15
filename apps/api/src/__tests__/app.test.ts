import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { redis } from "../lib/redis.js";

const app = buildApp();
const JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars-long";
const TOKEN = jwt.sign({ userId: "user-1" }, JWT_SECRET, { expiresIn: "7d" });

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("error handler", () => {
  it("returns 400 for ZodError on wallet routes", async () => {
    // POST /api/wallets with invalid body triggers ZodError in wallet route
    // which is NOT wrapped in try/catch, so it reaches the global error handler
    const response = await app.inject({
      method: "POST",
      url: "/api/wallets",
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: { address: "not-valid" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("Invalid request data");
  });
});

describe("GET /health", () => {
  it("returns ok when redis pings successfully", async () => {
    vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", redis: "connected" });
  });

  it("returns degraded when redis fails", async () => {
    vi.mocked(redis.ping).mockRejectedValueOnce(new Error("Connection refused"));

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "degraded", redis: "disconnected" });
  });
});
