import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId: number;
  action: string;
  targetType: string;
  targetId?: string | number | null;
  summary: string;
  payload?: Record<string, unknown> | null;
};

export async function recordAuditLog({
  userId,
  action,
  targetType,
  targetId,
  summary,
  payload,
}: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId: targetId === undefined || targetId === null ? null : String(targetId),
        summary,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log", error);
  }
}
