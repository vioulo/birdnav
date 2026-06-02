"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  BULK_IMPORT_ICON_CONCURRENCY,
  BULK_IMPORT_LIMIT,
  buildSitesFeedbackHref,
  readSiteFiltersFromForm,
} from "@/app/admin/sites/schema";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSiteForm } from "@/lib/validation";
import {
  bulkImportAdminSites,
  createAdminSite,
  deleteAdminSite,
  getSiteActionErrorMessage,
  updateAdminSite,
} from "@/services/sites/site-admin-service";

function revalidateSiteAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

export async function createSiteAction(formData: FormData) {
  const admin = await requireAdmin();
  const filters = readSiteFiltersFromForm(formData);
  const parsed = parseSiteForm(formData);

  if (!parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        1,
        "error",
        parsed.error.issues[0]?.message || "站点信息无效。",
        "new",
        filters,
      ),
    );
  }

  const {
    catId,
    name,
    slug,
    url,
    iconUrl,
    description,
    featureImage,
    isFeatured,
    sortOrder,
    isPublished,
    page,
  } = parsed.data;

  try {
    await createAdminSite({
      adminId: admin.id,
      catId,
      name,
      slug,
      url,
      iconUrl: iconUrl || undefined,
      description: description || undefined,
      featureImage: featureImage || undefined,
      isFeatured,
      sortOrder,
      isPublished,
      hasManualSortOrder: String(formData.get("sortOrder") ?? "").trim() !== "",
    });
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getSiteActionErrorMessage(error, "创建站点失败。"),
        "new",
        filters,
      ),
    );
  }

  revalidateSiteAdminPaths();
  redirect(buildSitesFeedbackHref(page, "success", "站点创建成功。", undefined, filters));
}

export async function bulkImportSitesAction(formData: FormData) {
  const admin = await requireAdmin();
  const page = Math.max(1, Number(formData.get("page") || 1));
  const filters = readSiteFiltersFromForm(formData);
  const catId = Number(formData.get("catId"));
  const rawLinks = String(formData.get("links") || "");
  const isPublished = formData.get("isPublished") === "on";

  if (!catId) {
    redirect(buildSitesFeedbackHref(page, "error", "请选择批量导入分类。", "bulk", filters));
  }

  const category = await prisma.category.findUnique({
    where: { id: catId },
    select: { id: true, name: true },
  });

  if (!category) {
    redirect(buildSitesFeedbackHref(page, "error", "分类不存在。", "bulk", filters));
  }

  try {
    const result = await bulkImportAdminSites({
      adminId: admin.id,
      catId,
      categoryName: category.name,
      rawLinks,
      isPublished,
      bulkImportLimit: BULK_IMPORT_LIMIT,
      iconConcurrency: BULK_IMPORT_ICON_CONCURRENCY,
    });

    revalidateSiteAdminPaths();

    if (result.skippedAll) {
      redirect(
        buildSitesFeedbackHref(
          page,
          "success",
          `没有新增站点，已跳过 ${result.parsedCount} 个重复链接。`,
          undefined,
          filters,
        ),
      );
    }

    redirect(
      buildSitesFeedbackHref(
        page,
        "success",
        `批量导入完成：新增 ${result.createdCount} 个，跳过重复 ${result.duplicateCount} 个，失败 ${result.failedCount} 个。`,
        undefined,
        filters,
      ),
    );
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getSiteActionErrorMessage(error, "批量导入站点失败。"),
        "bulk",
        filters,
      ),
    );
  }
}

export async function updateSiteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const filters = readSiteFiltersFromForm(formData);
  const parsed = parseSiteForm(formData);

  if (!id || !parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        parsed.success ? "站点不存在。" : parsed.error.issues[0]?.message || "站点信息无效。",
        undefined,
        filters,
      ),
    );
  }

  const {
    catId,
    name,
    slug,
    url,
    iconUrl,
    description,
    featureImage,
    isFeatured,
    sortOrder,
    isPublished,
  } = parsed.data;

  try {
    await updateAdminSite({
      adminId: admin.id,
      siteId: id,
      catId,
      name,
      slug,
      url,
      iconUrl: iconUrl || undefined,
      description: description || undefined,
      featureImage: featureImage || undefined,
      isFeatured,
      sortOrder,
      isPublished,
    });
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getSiteActionErrorMessage(error, "保存站点失败。"),
        undefined,
        filters,
      ),
    );
  }

  revalidateSiteAdminPaths();
  redirect(buildSitesFeedbackHref(page, "success", "站点保存成功。", undefined, filters));
}

export async function deleteSiteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const filters = readSiteFiltersFromForm(formData);

  if (!id) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。", undefined, filters));
  }

  try {
    await deleteAdminSite({
      adminId: admin.id,
      siteId: id,
    });
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getSiteActionErrorMessage(error, "删除站点失败。"),
        undefined,
        filters,
      ),
    );
  }

  revalidateSiteAdminPaths();
  redirect(buildSitesFeedbackHref(page, "success", "站点删除成功。", undefined, filters));
}
