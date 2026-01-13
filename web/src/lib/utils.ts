/**
 * Utility for conditionally joining class names.
 * Simple implementation without external deps.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function slugifyId(input: string, prefix = "cat") {
  const normalized = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const base = normalized.length > 0 ? normalized : "item";
  return `${prefix}-${base}`;
}
