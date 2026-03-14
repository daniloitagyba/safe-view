import Redis from "ioredis";
import { env } from "../config/env.js";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "127.0.0.1",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null as null,
  };
}

export const redisOptions = parseRedisUrl(env.REDIS_URL);

export const redis = new Redis(redisOptions);

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const { logger } = await import("./logger.js");
    logger.warn({ key }, "Corrupted JSON in Redis, key deleted");
    await redis.del(key);
    return null;
  }
}

export async function setJson<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
}

export async function del(key: string): Promise<void> {
  await redis.del(key);
}
