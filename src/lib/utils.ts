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
