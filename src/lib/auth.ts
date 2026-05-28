import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "birdnav_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return "birdnav-dev-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function createToken(payload: string) {
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  const [idText, issuedAtText] = payload.split(":");
  const id = Number(idText);
  const issuedAt = Number(issuedAtText);

  if (!id || !issuedAt) {
    return null;
  }

  const ageInSeconds = Math.floor((Date.now() - issuedAt) / 1000);

  if (ageInSeconds < 0 || ageInSeconds > SESSION_MAX_AGE) {
    return null;
  }

  return payload;
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
  const left = Buffer.from(derived);
  const right = Buffer.from(storedHash);

  return left.length === right.length && timingSafeEqual(left, right);
}

export async function loginAdmin(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    createToken(`${user.id}:${Date.now()}:${randomBytes(8).toString("hex")}`),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  );

  return true;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  const [idText] = payload.split(":");
  const id = Number(idText);

  if (!id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function changeAdminPassword(params: {
  userId: number;
  currentPassword: string;
  nextPassword: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
  });

  if (!user || !verifyPassword(params.currentPassword, user.passwordHash)) {
    return { ok: false as const, message: "当前密码不正确。" };
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      passwordHash: hashPassword(params.nextPassword),
    },
  });

  return { ok: true as const };
}
