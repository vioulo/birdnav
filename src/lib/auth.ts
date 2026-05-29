import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/prisma";

const SESSION_COOKIE = "birdnav_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

type CurrentAdmin = {
  id: number;
  username: string;
  role: "ADMIN";
};

type CurrentAdminContext = {
  admin: CurrentAdmin;
  sessionId: string;
};

type LoginResult =
  | {
      ok: true;
      userId: number;
      username: string;
    }
  | {
      ok: false;
      code: "invalid_credentials" | "rate_limited";
      retryAfterSeconds?: number;
      userId?: number;
    };

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseSessionCookieValue(value: string) {
  const separatorIndex = value.indexOf(".");

  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) {
    return null;
  }

  const sessionId = value.slice(0, separatorIndex);
  const token = value.slice(separatorIndex + 1);

  if (!sessionId || !token) {
    return null;
  }

  return { sessionId, token };
}

function buildSessionCookieValue(sessionId: string, token: string) {
  return `${sessionId}.${token}`;
}

function buildThrottleKeys(username: string, ipAddress?: string | null) {
  const scopeKeys = [`login:user:${username.trim().toLowerCase()}`];

  if (ipAddress) {
    scopeKeys.push(`login:ip:${ipAddress}`);
  }

  return scopeKeys;
}

function getBlockedRetryAfterSeconds(
  records: Array<{ blockedUntil: Date | null }>,
  now: Date,
) {
  const retryAfterMs = records.reduce((maxMs, record) => {
    if (!record.blockedUntil || record.blockedUntil <= now) {
      return maxMs;
    }

    return Math.max(maxMs, record.blockedUntil.getTime() - now.getTime());
  }, 0);

  return retryAfterMs > 0 ? Math.max(1, Math.ceil(retryAfterMs / 1000)) : null;
}

async function createAdminSession(userId: number) {
  const prisma = getPrisma();
  const sessionId = randomBytes(18).toString("hex");
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      tokenHash: hashSessionToken(sessionToken),
      userId,
      expiresAt,
      lastSeenAt: new Date(),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, buildSessionCookieValue(sessionId, sessionToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    priority: "high",
    maxAge: SESSION_MAX_AGE,
  });
}

async function getCurrentSessionPayload() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  return parseSessionCookieValue(sessionCookie);
}

async function clearThrottleScopes(scopeKeys: string[]) {
  const prisma = getPrisma();

  if (!scopeKeys.length) {
    return;
  }

  await prisma.authThrottle.deleteMany({
    where: {
      scopeKey: {
        in: scopeKeys,
      },
    },
  });
}

async function recordFailedLoginAttempt(
  scopeKeys: string[],
  currentRecords: Array<{
    scopeKey: string;
    attempts: number;
    blockedUntil: Date | null;
    windowStartedAt: Date;
  }>,
  now: Date,
) {
  const prisma = getPrisma();
  const blockedUntilValues = await Promise.all(
    scopeKeys.map(async (scopeKey) => {
      const currentRecord = currentRecords.find((record) => record.scopeKey === scopeKey);
      const hasFreshWindow =
        !!currentRecord &&
        now.getTime() - currentRecord.windowStartedAt.getTime() <= FAILED_LOGIN_WINDOW_MS &&
        (!currentRecord.blockedUntil || currentRecord.blockedUntil > now);
      const attempts = hasFreshWindow ? currentRecord.attempts + 1 : 1;
      const blockedUntil =
        attempts >= MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(now.getTime() + LOGIN_BLOCK_MS)
          : null;

      await prisma.authThrottle.upsert({
        where: { scopeKey },
        update: {
          attempts,
          blockedUntil,
          windowStartedAt: hasFreshWindow ? currentRecord.windowStartedAt : now,
          lastAttemptAt: now,
        },
        create: {
          scopeKey,
          attempts,
          blockedUntil,
          windowStartedAt: now,
          lastAttemptAt: now,
        },
      });

      return blockedUntil;
    }),
  );

  const latestBlockedUntil = blockedUntilValues.reduce<Date | null>((latest, value) => {
    if (!value) {
      return latest;
    }

    if (!latest || value > latest) {
      return value;
    }

    return latest;
  }, null);

  return latestBlockedUntil
    ? Math.max(1, Math.ceil((latestBlockedUntil.getTime() - now.getTime()) / 1000))
    : null;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, storedHash] = stored.split(":");

  if (scheme !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(derived, storedHash);
}

export async function attemptAdminLogin(params: {
  username: string;
  password: string;
  ipAddress?: string | null;
}): Promise<LoginResult> {
  const prisma = getPrisma();
  const now = new Date();
  const scopeKeys = buildThrottleKeys(params.username, params.ipAddress);
  const throttleRecords = await prisma.authThrottle.findMany({
    where: {
      scopeKey: {
        in: scopeKeys,
      },
    },
  });
  const retryAfterSeconds = getBlockedRetryAfterSeconds(throttleRecords, now);

  if (retryAfterSeconds) {
    return {
      ok: false,
      code: "rate_limited",
      retryAfterSeconds,
    };
  }

  const user = await prisma.user.findUnique({
    where: { username: params.username },
  });

  if (!user || !verifyPassword(params.password, user.passwordHash)) {
    const blockedAfterFailureSeconds = await recordFailedLoginAttempt(scopeKeys, throttleRecords, now);

    return blockedAfterFailureSeconds
      ? {
          ok: false,
          code: "rate_limited",
          retryAfterSeconds: blockedAfterFailureSeconds,
          userId: user?.id,
        }
      : {
          ok: false,
          code: "invalid_credentials",
          userId: user?.id,
        };
  }

  await clearThrottleScopes(scopeKeys);
  await createAdminSession(user.id);

  return {
    ok: true,
    userId: user.id,
    username: user.username,
  };
}

export async function logoutAdmin() {
  const prisma = getPrisma();
  const sessionPayload = await getCurrentSessionPayload();

  if (sessionPayload) {
    await prisma.adminSession.updateMany({
      where: {
        id: sessionPayload.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentAdminContext(): Promise<CurrentAdminContext | null> {
  const prisma = getPrisma();
  const sessionPayload = await getCurrentSessionPayload();

  if (!sessionPayload) {
    return null;
  }

  const session = await prisma.adminSession.findUnique({
    where: { id: sessionPayload.sessionId },
    select: {
      id: true,
      tokenHash: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  if (!safeEqual(session.tokenHash, hashSessionToken(sessionPayload.token))) {
    return null;
  }

  return {
    sessionId: session.id,
    admin: session.user,
  };
}

export async function getCurrentAdmin() {
  const context = await getCurrentAdminContext();
  return context?.admin ?? null;
}

export async function requireAdmin() {
  const context = await getCurrentAdminContext();

  if (!context) {
    redirect("/admin/login");
  }

  return context.admin;
}

export async function changeAdminPassword(params: {
  userId: number;
  currentPassword: string;
  nextPassword: string;
}) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
  });

  if (!user || !verifyPassword(params.currentPassword, user.passwordHash)) {
    return { ok: false as const, message: "当前密码不正确。" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.userId },
      data: {
        passwordHash: hashPassword(params.nextPassword),
      },
    }),
    prisma.adminSession.updateMany({
      where: { userId: params.userId },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  await createAdminSession(params.userId);

  return { ok: true as const };
}
