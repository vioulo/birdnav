import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { saveIconBuffer } from "@/lib/icon-storage-core";

const ICON_FETCH_TIMEOUT_MS = 4000;
const MAX_HTML_LENGTH = 240_000;
const MAX_ICON_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const ICON_CONTENT_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
  ["application/octet-stream", "ico"],
]);

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
  if (!href) {
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

function extractDataIcon(href: string) {
  const match = href.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);

  if (!match) {
    return null;
  }

  const mimeType = (match[1] || "text/plain").toLowerCase();
  const isBase64 = !!match[2];
  const payload = match[3] || "";
  const extension = ICON_CONTENT_TYPES.get(mimeType);

  if (!extension) {
    return null;
  }

  try {
    const buffer = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");

    if (!buffer.length || buffer.length > MAX_ICON_BYTES) {
      return null;
    }

    return {
      extension,
      buffer,
    };
  } catch {
    return null;
  }
}

function extractManifestIconCandidates(html: string, baseUrl: string) {
  const candidates: Array<{ href: string; score: number }> = [];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = readHtmlAttr(tag, "rel");

    if (rel.toLowerCase().trim() !== "manifest") {
      continue;
    }

    const href = toAbsoluteHttpUrl(baseUrl, readHtmlAttr(tag, "href"));

    if (!href) {
      continue;
    }

    candidates.push({
      href,
      score: 18,
    });
  }

  return candidates;
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

async function fetchJson(url: string) {
  const resolvedUrl = await resolvePublicHttpUrl(url);

  if (!resolvedUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(resolvedUrl, {
      cache: "no-store",
      headers: {
        accept: "application/manifest+json,application/json",
        "user-agent": "BirdNav icon resolver",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function extractManifestIcons(manifestUrl: string) {
  type ManifestIcon = {
    src?: unknown;
    sizes?: unknown;
    purpose?: unknown;
  };

  const manifest = await fetchJson(manifestUrl);

  if (!manifest || typeof manifest !== "object" || !("icons" in manifest)) {
    return [];
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];

  return (icons as ManifestIcon[])
    .map((icon: ManifestIcon) => {
      if (!icon || typeof icon !== "object") {
        return null;
      }

      const src = typeof icon.src === "string" ? icon.src : "";
      const sizes = typeof icon.sizes === "string" ? icon.sizes : "";
      const purpose = typeof icon.purpose === "string" ? icon.purpose : "";
      const href = toAbsoluteHttpUrl(manifestUrl, src);

      if (!href) {
        return null;
      }

      let score = 12;

      if (sizes.includes("512x512")) {
        score += 18;
      } else if (sizes.includes("192x192")) {
        score += 14;
      } else if (sizes.includes("180x180")) {
        score += 12;
      }

      if (purpose.includes("maskable")) {
        score += 4;
      }

      return {
        href,
        score,
      };
    })
    .filter((item): item is { href: string; score: number } => !!item);
}

function detectExtension(contentType: string, sourceUrl: string) {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  const mapped = ICON_CONTENT_TYPES.get(normalizedType);

  if (mapped) {
    return mapped;
  }

  try {
    const pathname = new URL(sourceUrl).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();

    if (ext && ext.length <= 5) {
      return ext;
    }
  } catch {
    // Ignore parse failures and fall back to ico.
  }

  return "ico";
}

async function readLimitedBinary(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || "0");

  if (contentLength && contentLength > MAX_ICON_BYTES) {
    return null;
  }

  const buffer = new Uint8Array(await response.arrayBuffer());

  if (!buffer.length || buffer.byteLength > MAX_ICON_BYTES) {
    return null;
  }

  return buffer;
}

async function downloadRemoteIcon(sourceUrl: string) {
  const resolvedUrl = await resolvePublicHttpUrl(sourceUrl);

  if (!resolvedUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(resolvedUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        accept: "image/*,*/*;q=0.8",
        "user-agent": "BirdNav icon resolver",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = await readLimitedBinary(response);

    if (!buffer) {
      return null;
    }

    return {
      sourceUrl: resolvedUrl.toString(),
      buffer,
      extension: detectExtension(contentType, resolvedUrl.toString()),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function persistIconCandidate(siteUrl: string, href: string) {
  const dataIcon = extractDataIcon(href);

  if (dataIcon) {
    return saveIconBuffer({
      siteUrl,
      buffer: dataIcon.buffer,
      extension: dataIcon.extension,
    });
  }

  const downloaded = await downloadRemoteIcon(href);

  if (!downloaded) {
    return null;
  }

  return saveIconBuffer({
    siteUrl,
    sourceUrl: downloaded.sourceUrl,
    buffer: downloaded.buffer,
    extension: downloaded.extension,
  });
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

    const rawHref = readHtmlAttr(tag, "href");
    const href = /^data:/i.test(rawHref)
      ? rawHref
      : toAbsoluteHttpUrl(resolvedUrl.toString(), rawHref);

    if (!href) {
      continue;
    }

    candidates.push({
      href,
      score: getIconScore(rel, readHtmlAttr(tag, "sizes")),
    });
  }

  const manifestCandidates = extractManifestIconCandidates(html, resolvedUrl.toString());
  for (const manifest of manifestCandidates) {
    candidates.push(...(await extractManifestIcons(manifest.href)));
  }

  candidates.push({
    href: new URL("/favicon.ico", resolvedUrl.origin).toString(),
    score: 6,
  });

  candidates.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate.href)) {
      continue;
    }

    seen.add(candidate.href);

    const storedPath = await persistIconCandidate(resolvedUrl.toString(), candidate.href);

    if (storedPath) {
      return storedPath;
    }
  }

  return null;
}
