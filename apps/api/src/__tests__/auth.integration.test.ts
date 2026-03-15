import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = buildApp();

const TEST_USER = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  googleId: "google-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars-long";

function createToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /auth/me", () => {
  it("returns user data with valid token", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(TEST_USER);

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${createToken("user-1")}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      id: "user-1",
      email: "test@example.com",
    });
  });

  it("returns 401 without authorization header", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 with invalid token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer invalid-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Invalid token" });
  });

  it("returns 401 when user not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${createToken("nonexistent")}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "User not found" });
  });

  it("returns 401 with malformed authorization header", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "NotBearer token" },
    });

    expect(response.statusCode).toBe(401);
  });
});
