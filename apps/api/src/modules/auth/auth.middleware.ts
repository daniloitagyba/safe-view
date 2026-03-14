import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface AuthPayload {
  userId: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    request.log.warn("Auth failed: missing or malformed Authorization header");
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const token = authorization.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    (request as FastifyRequest & { userId: string }).userId = decoded.userId;
  } catch (err) {
    request.log.warn({ err }, "Auth failed: invalid token");
    return reply.status(401).send({ error: "Invalid token" });
  }
}
