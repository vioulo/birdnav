export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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
