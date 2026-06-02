"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildCatsFeedbackHref,
} from "@/app/admin/cats/schema";
import { requireAdmin } from "@/lib/auth";
import { parseCategoryForm } from "@/lib/validation";
import {
  createAdminCategory,
  deleteAdminCategory,
  getCategoryActionErrorMessage,
  updateAdminCategory,
} from "@/services/categories/category-admin-service";

function revalidateCategoryAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

export async function createCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const keyword = String(formData.get("q") || "").trim();
  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    redirect(
      buildCatsFeedbackHref(
        1,
        "error",
        parsed.error.issues[0]?.message || "分类信息无效。",
        "new",
        keyword,
      ),
    );
  }

  const { name, slug: slugInput, color, sortOrder, page } = parsed.data;

  try {
    await createAdminCategory({
      adminId: admin.id,
      name,
      slugInput: slugInput || "",
      color,
      sortOrder,
    });
  } catch (error) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        getCategoryActionErrorMessage(error, "创建分类失败。"),
        "new",
        keyword,
      ),
    );
  }

  revalidateCategoryAdminPaths();
  redirect(buildCatsFeedbackHref(page, "success", "分类创建成功。", undefined, keyword));
}

export async function updateCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const keyword = String(formData.get("q") || "").trim();
  const parsed = parseCategoryForm(formData);

  if (!id || !parsed.success) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        parsed.success ? "分类不存在。" : parsed.error.issues[0]?.message || "分类信息无效。",
        undefined,
        keyword,
      ),
    );
  }

  const { name, slug: slugInput, color, sortOrder } = parsed.data;

  try {
    await updateAdminCategory({
      adminId: admin.id,
      categoryId: id,
      name,
      slugInput: slugInput || "",
      color,
      sortOrder,
    });
  } catch (error) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        getCategoryActionErrorMessage(error, "保存分类失败。"),
        undefined,
        keyword,
      ),
    );
  }

  revalidateCategoryAdminPaths();
  redirect(buildCatsFeedbackHref(page, "success", "分类保存成功。", undefined, keyword));
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const keyword = String(formData.get("q") || "").trim();

  if (!id) {
    redirect(buildCatsFeedbackHref(page, "error", "分类不存在。", undefined, keyword));
  }

  try {
    await deleteAdminCategory({
      adminId: admin.id,
      categoryId: id,
    });
  } catch (error) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        getCategoryActionErrorMessage(error, "删除分类失败。"),
        undefined,
        keyword,
      ),
    );
  }

  revalidateCategoryAdminPaths();
  redirect(
    buildCatsFeedbackHref(page, "success", "分类及其下属站点已删除。", undefined, keyword),
  );
}
