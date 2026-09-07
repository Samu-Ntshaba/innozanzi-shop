export function safeLocalRedirect(value: string | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try { const url = new URL(value, "https://local.invalid"); return url.origin === "https://local.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback; } catch { return fallback; }
}
