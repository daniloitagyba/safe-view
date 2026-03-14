import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { walletRoutes } from "./modules/wallet/wallet.routes.js";
import { redis } from "./lib/redis.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  app.register(authRoutes);
  app.register(walletRoutes, { prefix: "/api" });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return reply.status(400).send({ error: "Invalid request data" });
    }

    // Rate limit
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: "Too many requests" });
    }

    // Don't leak internal details
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? "Internal server error" : error.message,
    });
  });

  app.get("/health", async () => {
    const redisPing = await redis.ping().catch(() => "FAIL");
    return {
      status: redisPing === "PONG" ? "ok" : "degraded",
      redis: redisPing === "PONG" ? "connected" : "disconnected",
    };
  });

  return app;
}
