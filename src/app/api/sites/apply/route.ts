import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { getActionErrorMessage } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/public-rate-limit";
import { discoverSiteIconUrl } from "@/lib/site-icon";
import { buildDefaultSiteSlug, createUniqueSiteSlug } from "@/lib/site-slug";
import { parsePublicSiteApply } from "@/lib/validation";

export const runtime = "nodejs";

const APPLY_RATE_LIMITS = [
  {
    name: "site_apply_minute",
    limit: 30,
    windowMs: 60 * 1000,
  },
  {
    name: "site_apply_day",
    limit: 1000,
    windowMs: 24 * 60 * 60 * 1000,
  },
] as const;

function getClientScope(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown";
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 120) || "unknown";

  return `${ipAddress}:${userAgent}`;
}

async function readRequestJson(request: NextRequest) {
  try {
    const payload = await request.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getUrlLookupVariants(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname === "/" && !parsedUrl.search) {
      return [parsedUrl.origin, `${parsedUrl.origin}/`];
    }
  } catch {
    // Validation has already handled malformed URLs.
  }

  return [url];
}

export async function POST(request: NextRequest) {
  const rateLimit = await consumeRateLimit(getClientScope(request), APPLY_RATE_LIMITS);

  if (!rateLimit.allowed) {
    return Response.json(
      {
        ok: false,
        message:
          rateLimit.windowName === "site_apply_day"
            ? "今天提交次数已达上限，请明天再试。"
            : "提交过于频繁，请稍后再试。",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const payload = await readRequestJson(request);

  if (!payload) {
    return Response.json({ ok: false, message: "请求内容无效。" }, { status: 400 });
  }

  const parsed = parsePublicSiteApply(payload);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message || "站点信息无效。",
      },
      { status: 400 },
    );
  }

  const { catId, name, url, iconUrl, description } = parsed.data;
  const category = await prisma.category.findUnique({
    where: { id: catId },
    select: { id: true },
  });

  if (!category) {
    return Response.json({ ok: false, message: "分类不存在。" }, { status: 400 });
  }

  const existingSite = await prisma.site.findFirst({
    where: {
      url: {
        in: getUrlLookupVariants(url),
      },
    },
    select: {
      id: true,
    },
  });

  if (existingSite) {
    return Response.json(
      { ok: false, message: "这个链接已经在收录或审核中。" },
      { status: 409 },
    );
  }

  try {
    const resolvedIconUrl = iconUrl || await discoverSiteIconUrl(url);
    const slug = await createUniqueSiteSlug(buildDefaultSiteSlug(url));

    await prisma.site.create({
      data: {
        catId,
        name,
        slug,
        url,
        iconUrl: resolvedIconUrl,
        description: description || null,
        isFeatured: false,
        featureImage: null,
        sortOrder: 0,
        isPublished: false,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: getActionErrorMessage(error, "提交失败，请稍后再试。"),
      },
      { status: 500 },
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sites");

  return Response.json({
    ok: true,
    message: "申请已提交，审核通过后会展示到前台。",
  });
}
