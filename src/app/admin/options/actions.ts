"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildOptionsFeedbackHref } from "@/app/admin/options/schema";
import { requireAdmin } from "@/lib/auth";
import { parseOptionsForm } from "@/lib/validation";
import { updateAdminOptions } from "@/services/options/options-admin-service";

function revalidateOptionAdminPaths() {
  revalidatePath("/");
  revalidatePath("/admin/options");
}

export async function updateOptionsAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = parseOptionsForm(formData);

  if (!parsed.success) {
    redirect(
      buildOptionsFeedbackHref(
        "error",
        parsed.error.issues[0]?.message || "配置内容无效。",
      ),
    );
  }

  const {
    siteTitle,
    siteSubtitle,
    siteDescription,
    siteKeywords,
    siteUrl,
    siteOgImage,
    uiRadius,
    clickBehavior,
    homePageSize,
    homeFeaturedLimit,
    footerCopyright,
    footerLinks,
  } = parsed.data;

  await updateAdminOptions({
    adminId: admin.id,
    siteTitle,
    siteSubtitle,
    siteDescription,
    siteKeywords,
    siteUrl: siteUrl || undefined,
    siteOgImage: siteOgImage || undefined,
    uiRadius,
    clickBehavior,
    homePageSize,
    homeFeaturedLimit,
    footerCopyright,
    footerLinks,
  });

  revalidateOptionAdminPaths();
  redirect(buildOptionsFeedbackHref("success", "配置保存成功。"));
}
