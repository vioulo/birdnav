import { Prisma } from "@prisma/client";

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "保存失败，存在重复的唯一值。";
    }

    if (error.code === "P2025") {
      return "目标数据不存在或已被删除。";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
