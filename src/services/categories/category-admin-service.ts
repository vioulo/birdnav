import { recordAuditLog } from "@/lib/audit";
import { getActionErrorMessage } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function createAdminCategory(params: {
  adminId: number;
  name: string;
  slugInput: string;
  color: string;
  sortOrder: number;
}) {
  const slug = slugify(params.slugInput || params.name);
  const createdCategory = await prisma.category.create({
    data: {
      name: params.name,
      slug,
      color: params.color,
      sortOrder: params.sortOrder,
    },
  });

  await recordAuditLog({
    userId: params.adminId,
    action: "category.create",
    targetType: "category",
    targetId: createdCategory.id,
    summary: `创建分类 ${createdCategory.name}`,
    payload: {
      slug: createdCategory.slug,
      color: createdCategory.color,
      sortOrder: createdCategory.sortOrder,
    },
  });

  return createdCategory;
}

export async function updateAdminCategory(params: {
  adminId: number;
  categoryId: number;
  name: string;
  slugInput: string;
  color: string;
  sortOrder: number;
}) {
  const slug = slugify(params.slugInput || params.name);
  const updatedCategory = await prisma.category.update({
    where: { id: params.categoryId },
    data: {
      name: params.name,
      slug,
      color: params.color,
      sortOrder: params.sortOrder,
    },
  });

  await recordAuditLog({
    userId: params.adminId,
    action: "category.update",
    targetType: "category",
    targetId: updatedCategory.id,
    summary: `更新分类 ${updatedCategory.name}`,
    payload: {
      slug: updatedCategory.slug,
      color: updatedCategory.color,
      sortOrder: updatedCategory.sortOrder,
    },
  });

  return updatedCategory;
}

export async function deleteAdminCategory(params: {
  adminId: number;
  categoryId: number;
}) {
  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    include: {
      _count: {
        select: {
          sites: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error("分类不存在。");
  }

  await prisma.category.delete({
    where: { id: params.categoryId },
  });

  await recordAuditLog({
    userId: params.adminId,
    action: "category.delete",
    targetType: "category",
    targetId: category.id,
    summary: `删除分类 ${category.name}`,
    payload: {
      slug: category.slug,
      siteCount: category._count.sites,
    },
  });

  return category;
}

export function getCategoryActionErrorMessage(error: unknown, fallback: string) {
  return getActionErrorMessage(error, fallback);
}
