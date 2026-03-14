import Fastify from "fastify";
import cors from "@fastify/cors";
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

  app.register(authRoutes);
  app.register(walletRoutes, { prefix: "/api" });

  app.get("/health", async () => {
    const redisPing = await redis.ping().catch(() => "FAIL");
    return {
      status: redisPing === "PONG" ? "ok" : "degraded",
      redis: redisPing === "PONG" ? "connected" : "disconnected",
    };
  });

  return app;
}
