import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "birdnav_admin_session";

function getSessionSecret() {
  return process.env.SESSION_SECRET || "replace-this-in-production";
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
    createToken(`${user.id}:${user.username}:${Date.now()}`),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
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
