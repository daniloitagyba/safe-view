import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

const googleTokenSchema = z.object({
  credential: z.string(),
});

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/google", async (request, reply) => {
    const { credential } = googleTokenSchema.parse(request.body);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return reply.status(401).send({ error: "Invalid Google token" });
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        name: payload.name,
        avatarUrl: payload.picture,
        email: payload.email,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
      },
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return reply.send({ token, user });
  });

  app.get("/auth/me", async (request, reply) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const token = authorization.slice(7);
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      return reply.send({ user });
    } catch {
      return reply.status(401).send({ error: "Invalid token" });
    }
  });
}
