import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const ICON_FETCH_TIMEOUT_MS = 4000;
const MAX_HTML_LENGTH = 240_000;
const MAX_REDIRECTS = 3;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

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

function isPrivateIPv4(address: string) {
  const octets = address.split(".").map((value) => Number(value));

  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
    return true;
  }

  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedIPv4 = normalized.slice("::ffff:".length);
    return mappedIPv4.includes(".") ? isPrivateIPv4(mappedIPv4) : true;
  }

  return false;
}

function isPrivateOrLoopbackAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIPv4(address);
  }

  if (version === 6) {
    return isPrivateIPv6(address);
  }

  return true;
}

async function resolvePublicHttpUrl(candidateUrl: string) {
  let url: URL;

  try {
    url = new URL(candidateUrl);
  } catch {
    return null;
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:") || !ALLOWED_PORTS.has(url.port)) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return null;
  }

  try {
    const addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true, verbatim: true });

    if (!addresses.length || addresses.some(({ address }) => isPrivateOrLoopbackAddress(address))) {
      return null;
    }
  } catch {
    return null;
  }

  return url;
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

async function readLimitedHtml(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || "0");

  if (contentLength && contentLength > MAX_HTML_LENGTH) {
    return "";
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > MAX_HTML_LENGTH) {
      await reader.cancel();
      return "";
    }

    html += decoder.decode(value, { stream: true });
  }

  html += decoder.decode();
  return html;
}

async function fetchSiteHtml(siteUrl: string) {
  let currentUrl = siteUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const resolvedUrl = await resolvePublicHttpUrl(currentUrl);

    if (!resolvedUrl) {
      return "";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(resolvedUrl, {
        cache: "no-store",
        redirect: "manual",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "BirdNav icon resolver",
        },
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location) {
          return "";
        }

        currentUrl = new URL(location, resolvedUrl).toString();
        continue;
      }

      if (!response.ok) {
        return "";
      }

      const contentType = response.headers.get("content-type") || "";

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        return "";
      }

      return readLimitedHtml(response);
    } catch {
      return "";
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return "";
}

export async function discoverSiteIconUrl(siteUrl: string) {
  const resolvedUrl = await resolvePublicHttpUrl(siteUrl);

  if (!resolvedUrl) {
    return null;
  }

  const html = await fetchSiteHtml(resolvedUrl.toString());
  const candidates: Array<{ href: string; score: number }> = [];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = readHtmlAttr(tag, "rel");

    if (!isIconRel(rel)) {
      continue;
    }

    const href = toAbsoluteHttpUrl(resolvedUrl.toString(), readHtmlAttr(tag, "href"));

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

  return new URL("/favicon.ico", resolvedUrl.origin).toString();
}
