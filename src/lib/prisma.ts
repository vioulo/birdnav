import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasRequiredDelegates(client: PrismaClient | undefined) {
  if (!client) {
    return false;
  }

  const candidate = client as PrismaClient & {
    adminSession?: unknown;
    authThrottle?: unknown;
  };

  return !!candidate.adminSession && !!candidate.authThrottle;
}

export function getPrisma() {
  if (globalForPrisma.prisma && !hasRequiredDelegates(globalForPrisma.prisma)) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  const client = globalForPrisma.prisma ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
