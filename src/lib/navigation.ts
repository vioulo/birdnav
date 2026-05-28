export function sanitizeRedirectPath(value: string, fallback = "/") {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
