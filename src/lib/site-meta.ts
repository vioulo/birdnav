import "server-only";

import { fetchSiteHtml, resolvePublicHttpUrl } from "@/lib/site-icon-core";

const MAX_DESCRIPTION_LENGTH = 500;

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractMetaDescription(html: string) {
  // Match <meta name="description" content="...">
  const metaRegex = /<meta\b[^>]*>/gi;

  for (const match of html.matchAll(metaRegex)) {
    const tag = match[0];
    const nameMatch = tag.match(
      /(?:^|\s)name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+))/i,
    );
    const name = (nameMatch?.[1] || nameMatch?.[2] || nameMatch?.[3] || "").trim().toLowerCase();

    if (name !== "description") {
      continue;
    }

    const contentMatch = tag.match(
      /(?:^|\s)content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+))/i,
    );
    const content = (contentMatch?.[1] || contentMatch?.[2] || contentMatch?.[3] || "").trim();

    if (content) {
      return decodeHtmlEntities(content).slice(0, MAX_DESCRIPTION_LENGTH);
    }
  }

  // Fallback: try <title> if no meta description found
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  if (titleMatch?.[1]) {
    const title = decodeHtmlEntities(titleMatch[1].trim());

    if (title) {
      return title.slice(0, MAX_DESCRIPTION_LENGTH);
    }
  }

  return null;
}

export async function discoverSiteDescription(siteUrl: string) {
  const resolvedUrl = await resolvePublicHttpUrl(siteUrl);

  if (!resolvedUrl) {
    return null;
  }

  const html = await fetchSiteHtml(resolvedUrl.toString());

  if (!html) {
    return null;
  }

  return extractMetaDescription(html);
}
