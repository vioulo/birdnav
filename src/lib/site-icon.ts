import "server-only";

const ICON_FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_LENGTH = 240_000;

function readHtmlAttr(tag: string, attr: string) {
  const match = tag.match(
    new RegExp(`(?:^|\\s)${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s/>]+))`, "i"),
  );

  return match?.[1] || match?.[2] || match?.[3] || "";
}

function isIconRel(rel: string) {
  const tokens = rel.toLowerCase().split(/\s+/).filter(Boolean);

  return (
    tokens.includes("icon") ||
    tokens.includes("apple-touch-icon") ||
    tokens.includes("apple-touch-icon-precomposed") ||
    tokens.includes("mask-icon")
  );
}

function getIconScore(rel: string, sizes: string) {
  const normalizedRel = rel.toLowerCase();
  const normalizedSizes = sizes.toLowerCase();
  let score = 0;

  if (normalizedRel.includes("icon")) {
    score += 40;
  }

  if (normalizedRel.includes("apple-touch-icon")) {
    score += 28;
  }

  if (normalizedRel.includes("shortcut")) {
    score -= 5;
  }

  if (normalizedRel.includes("mask-icon")) {
    score -= 15;
  }

  if (normalizedSizes.includes("192x192") || normalizedSizes.includes("180x180")) {
    score += 16;
  } else if (normalizedSizes.includes("32x32")) {
    score += 12;
  } else if (normalizedSizes.includes("16x16")) {
    score += 4;
  }

  return score;
}

function toAbsoluteHttpUrl(baseUrl: string, href: string) {
  if (!href || /^data:/i.test(href)) {
    return null;
  }

  try {
    const url = new URL(href, baseUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchSiteHtml(siteUrl: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(siteUrl, {
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "BirdNav icon resolver",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return html.slice(0, MAX_HTML_LENGTH);
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function discoverSiteIconUrl(siteUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(siteUrl);
  } catch {
    return null;
  }

  const html = await fetchSiteHtml(parsedUrl.toString());
  const candidates: Array<{ href: string; score: number }> = [];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = readHtmlAttr(tag, "rel");

    if (!isIconRel(rel)) {
      continue;
    }

    const href = toAbsoluteHttpUrl(parsedUrl.toString(), readHtmlAttr(tag, "href"));

    if (!href) {
      continue;
    }

    candidates.push({
      href,
      score: getIconScore(rel, readHtmlAttr(tag, "sizes")),
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates[0]) {
    return candidates[0].href;
  }

  return new URL("/favicon.ico", parsedUrl.origin).toString();
}
