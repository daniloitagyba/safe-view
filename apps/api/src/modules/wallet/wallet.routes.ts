import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../auth/auth.middleware.js";
import {
  getEthBalance,
  getTokenBalances,
  getEthPrices,
} from "../../lib/alchemy.js";
import type { FiatCurrency } from "../../lib/alchemy.js";

const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

const addWalletSchema = z.object({
  address: z.string().regex(ethAddressRegex, "Invalid Ethereum address"),
  label: z.string().optional(),
});

const walletParamsSchema = z.object({
  id: z.string(),
});

const updateWalletSchema = z.object({
  label: z.string().optional(),
});

const balancesQuerySchema = z.object({
  currency: z.enum(["usd", "eur", "brl"]).default("usd"),
});

type AuthenticatedRequest = FastifyRequest & { userId: string };

export async function walletRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/wallets", async (request) => {
    const { userId } = request as AuthenticatedRequest;

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return { wallets };
  });

  app.post("/wallets", async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { address, label } = addWalletSchema.parse(request.body);

    const normalizedAddress = address.toLowerCase();

    const existing = await prisma.wallet.findUnique({
      where: {
        userId_address: { userId, address: normalizedAddress },
      },
    });

    if (existing) {
      return reply.status(409).send({ error: "Wallet already added" });
    }

    const wallet = await prisma.wallet.create({
      data: {
        address: normalizedAddress,
        label,
        userId,
      },
    });

    return reply.status(201).send({ wallet });
  });

  app.patch("/wallets/:id", async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { id } = walletParamsSchema.parse(request.params);
    const { label } = updateWalletSchema.parse(request.body);

    const wallet = await prisma.wallet.findFirst({
      where: { id, userId },
    });

    if (!wallet) {
      return reply.status(404).send({ error: "Wallet not found" });
    }

    const updated = await prisma.wallet.update({
      where: { id },
      data: { label: label ?? null },
    });

    return { wallet: updated };
  });

  app.delete("/wallets/:id", async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { id } = walletParamsSchema.parse(request.params);

    const wallet = await prisma.wallet.findFirst({
      where: { id, userId },
    });

    if (!wallet) {
      return reply.status(404).send({ error: "Wallet not found" });
    }

    await prisma.wallet.delete({ where: { id } });

    return reply.status(204).send();
  });

  app.get("/wallets/:id/balances", async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { id } = walletParamsSchema.parse(request.params);

    const wallet = await prisma.wallet.findFirst({
      where: { id, userId },
    });

    if (!wallet) {
      return reply.status(404).send({ error: "Wallet not found" });
    }

    const { currency } = balancesQuerySchema.parse(request.query);

    const [ethBalanceWei, tokens, ethPrices] = await Promise.all([
      getEthBalance(wallet.address),
      getTokenBalances(wallet.address),
      getEthPrices(),
    ]);

    const ethBalance = parseFloat(ethBalanceWei) / 1e18;
    const ethPrice = ethPrices[currency];

    const tokensWithValue = tokens.map((token) => ({
      ...token,
      valueFiat: token.prices ? token.balanceFormatted * token.prices[currency] : null,
    }));

    const tokensTotal = tokensWithValue.reduce(
      (sum, t) => sum + (t.valueFiat ?? 0),
      0
    );

    return {
      address: wallet.address,
      currency,
      ethBalance,
      ethPrice,
      ethValue: ethBalance * ethPrice,
      totalValue: ethBalance * ethPrice + tokensTotal,
      tokens: tokensWithValue,
    };
  });
}
