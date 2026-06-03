export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function slugifySite(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9._\u4e00-\u9fa5-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function inferSiteSlugFromUrl(url: string) {
  try {
    const parsedUrl = new URL(normalizeUrl(url));
    const hostname = parsedUrl.hostname.replace(/^www\./i, "").toLowerCase();

    return slugifySite(hostname);
  } catch {
    return slugifySite(url);
  }
}

export function normalizeUrl(input: string) {
  const value = input.trim();

  if (!value) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

/**
 * 从 host 字符串中提取干净的域名作为 utm_source 值。
 * 去掉端口号和 www 前缀。
 */
export function extractUtmSource(host: string): string {
  return host
    .split(":")[0]
    .replace(/^www\./i, "")
    .toLowerCase() || "birdnav";
}

/**
 * 为外部站点链接追加 utm_source 跟踪参数。
 * 如果 URL 已包含 utm_source 则保持不变。
 */
export function appendUtmSource(url: string, source: string): string {
  if (!source) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("utm_source")) {
      parsed.searchParams.set("utm_source", source);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
