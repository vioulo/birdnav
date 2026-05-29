import { z } from "zod";

import { isSiteClickBehavior } from "@/lib/options";
import { normalizeUrl } from "@/lib/utils";

const colorHexPattern = /^#([0-9a-f]{6})$/i;
const httpUrlPattern = /^https?:\/\//i;

function toOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : 0;
}

const optionalHttpUrl = z
  .string()
  .url("请输入合法链接。")
  .refine((value) => httpUrlPattern.test(value), "仅支持 http 或 https 链接。")
  .optional();

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名。").max(64, "用户名过长。"),
  password: z.string().min(1, "请输入密码。").max(255, "密码过长。"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码。").max(255, "当前密码过长。"),
    nextPassword: z
      .string()
      .min(8, "新密码至少需要 8 位。")
      .max(255, "新密码过长。"),
    confirmPassword: z.string().min(1, "请再次输入新密码。").max(255, "确认密码过长。"),
  })
  .refine((value) => value.nextPassword === value.confirmPassword, {
    message: "两次输入的新密码不一致。",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.nextPassword, {
    message: "新密码不能与当前密码相同。",
    path: ["nextPassword"],
  });

export const categorySchema = z.object({
  name: z.string().trim().min(1, "分类名称不能为空。").max(120, "分类名称过长。"),
  slug: z
    .string()
    .trim()
    .max(160, "Slug 过长。")
    .regex(/^[a-z0-9\u4e00-\u9fa5-]*$/i, "Slug 仅支持字母、数字、中文和短横线。")
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .trim()
    .regex(colorHexPattern, "颜色值必须是 6 位十六进制。"),
  sortOrder: z.coerce.number().int("排序必须是整数。").min(-9999).max(9999),
  page: z.coerce.number().int().min(1).default(1),
});

export const siteSchema = z.object({
  catId: z.coerce.number().int("请选择分类。").positive("请选择分类。"),
  name: z.string().trim().min(1, "站点名称不能为空。").max(160, "站点名称过长。"),
  url: z
    .string()
    .trim()
    .url("请输入合法链接。")
    .refine((value) => httpUrlPattern.test(value), "仅支持 http 或 https 链接。"),
  iconUrl: optionalHttpUrl.or(z.literal("")),
  description: z.string().trim().max(500, "简介不能超过 500 字。").optional().or(z.literal("")),
  featureImage: optionalHttpUrl.or(z.literal("")),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int("排序必须是整数。").min(-9999).max(9999),
  isPublished: z.boolean(),
  page: z.coerce.number().int().min(1).default(1),
});

export const optionsSchema = z.object({
  siteTitle: z.string().trim().min(1, "站点标题不能为空。").max(80, "站点标题过长。"),
  siteSubtitle: z.string().trim().max(160, "站点副标题过长。"),
  siteDescription: z.string().trim().min(1, "SEO 描述不能为空。").max(180, "SEO 描述过长。"),
  siteKeywords: z.string().trim().max(300, "SEO 关键词过长。"),
  siteUrl: optionalHttpUrl.or(z.literal("")),
  siteOgImage: optionalHttpUrl.or(z.literal("")),
  clickBehavior: z.string().refine(isSiteClickBehavior, "站点点击行为无效。"),
  footerCopyright: z
    .string()
    .trim()
    .min(1, "版权信息不能为空。")
    .max(200, "版权信息过长。"),
  footerLinks: z.string().trim().max(4000, "友情链接配置过长。"),
}).superRefine((value, ctx) => {
  const lines = value.footerLinks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const [label, href] = line.split("|").map((part) => part.trim());

    if (!label || !href) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["footerLinks"],
        message: "友情链接格式必须是 每行 名称|链接。",
      });
      return;
    }

    const parsed = z.string().url().safeParse(href);

    if (!parsed.success || !httpUrlPattern.test(href)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["footerLinks"],
        message: "友情链接必须使用合法的 http 或 https 链接。",
      });
      return;
    }
  }
});

export const themeRouteSchema = z.object({
  theme: z.enum(["dark", "light"]),
  redirectTo: z.string().trim().default("/"),
});

export function parseLoginForm(formData: FormData) {
  return loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
}

export function parsePasswordChangeForm(formData: FormData) {
  return passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    nextPassword: formData.get("nextPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
}

export function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    color: formData.get("color"),
    sortOrder: formData.get("sortOrder"),
    page: formData.get("page"),
  });
}

export function parseSiteForm(formData: FormData) {
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  const iconUrl = normalizeUrl(String(formData.get("iconUrl") ?? ""));
  const featureImage = normalizeUrl(String(formData.get("featureImage") ?? ""));

  return siteSchema.safeParse({
    catId: formData.get("catId"),
    name: formData.get("name"),
    url,
    iconUrl,
    description: formData.get("description"),
    featureImage,
    isFeatured: formData.get("isFeatured") === "on",
    sortOrder: formData.get("sortOrder"),
    isPublished: formData.get("isPublished") === "on",
    page: formData.get("page"),
  });
}

export function parseOptionsForm(formData: FormData) {
  const siteUrl = normalizeUrl(String(formData.get("site.url") ?? ""));
  const siteOgImage = normalizeUrl(String(formData.get("site.og_image") ?? ""));

  return optionsSchema.safeParse({
    siteTitle: formData.get("site.title"),
    siteSubtitle: formData.get("site.subtitle"),
    siteDescription: formData.get("site.description"),
    siteKeywords: formData.get("site.keywords"),
    siteUrl,
    siteOgImage,
    clickBehavior: formData.get("site.click_behavior"),
    footerCopyright: formData.get("footer.copyright"),
    footerLinks: formData.get("footer.links"),
  });
}

export function readOptionalString(value: unknown) {
  return toOptionalString(value);
}

export function readOptionalNumber(value: unknown) {
  return toOptionalNumber(value);
}
