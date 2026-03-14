import "dotenv/config";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { initWorker, shutdownWorker } from "./lib/sync-worker.js";
import { redis } from "./lib/redis.js";

const app = buildApp();

app.listen({ port: env.PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  initWorker();
});

async function gracefulShutdown(signal: string) {
  console.log(`[server] ${signal} received, shutting down...`);
  await app.close();
  await shutdownWorker();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
