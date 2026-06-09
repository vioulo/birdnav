import { NextResponse } from "next/server";

import { getOptionValue, isSiteClickBehavior, type SiteClickBehavior } from "@/lib/options";
import { getHomeSitesPage, readPositiveInteger } from "@/services/sites/site-home-service";
import { extractUtmSource } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category")?.trim() || "all";
  const search = searchParams.get("q")?.trim() || "";
  const page = readPositiveInteger(searchParams.get("page"), 1, 9999);
  const pageSize = readPositiveInteger(searchParams.get("pageSize"), 100, 500);
  const clickBehaviorRaw = await getOptionValue("site.click_behavior", "detail");
  const clickBehavior: SiteClickBehavior = isSiteClickBehavior(clickBehaviorRaw)
    ? clickBehaviorRaw
    : "detail";
  const utmSource = extractUtmSource(request.headers.get("host") || "");
  const result = await getHomeSitesPage({
    categorySlug,
    search,
    page,
    pageSize,
    clickBehavior,
    utmSource,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
