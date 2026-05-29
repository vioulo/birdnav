import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

type RateLimitRule = {
  name: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
      limit: number;
      windowName: string;
    };

function hashScope(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function getWindowStart(timestamp: number, windowMs: number) {
  return Math.floor(timestamp / windowMs) * windowMs;
}

export async function consumeRateLimit(
  scope: string,
  rules: readonly RateLimitRule[],
): Promise<RateLimitResult> {
  const scopeHash = hashScope(scope || "unknown");
  const nowMs = Date.now();
  const now = new Date(nowMs);

  for (const rule of rules) {
    const windowStartMs = getWindowStart(nowMs, rule.windowMs);
    const windowEndMs = windowStartMs + rule.windowMs;
    const scopeKey = `public_rate:${rule.name}:${scopeHash}:${windowStartMs}`;
    const record = await prisma.authThrottle.upsert({
      where: { scopeKey },
      update: {
        attempts: {
          increment: 1,
        },
        lastAttemptAt: now,
      },
      create: {
        scopeKey,
        attempts: 1,
        windowStartedAt: new Date(windowStartMs),
        lastAttemptAt: now,
      },
    });

    if (record.attempts > rule.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));

      await prisma.authThrottle.update({
        where: { scopeKey },
        data: {
          blockedUntil: new Date(windowEndMs),
        },
      });

      return {
        allowed: false,
        retryAfterSeconds,
        limit: rule.limit,
        windowName: rule.name,
      };
    }
  }

  return { allowed: true };
}
