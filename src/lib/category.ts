export const MAX_CATEGORY_LENGTH = 50;

export function isBadCategory(value: string | null | undefined): boolean {
  const t = value?.trim();
  if (!t) return true;
  if (/reviews mention/i.test(t)) return true;
  if (/avg\.?\s*project cost/i.test(t)) return true;
  if (/project highlight/i.test(t)) return true;
  if (/\d+\s+of\s+\d+/i.test(t) && /reviews?/i.test(t)) return true;
  return false;
}

export function truncateCategory(value: string): string {
  const t = value.trim();
  if (t.length <= MAX_CATEGORY_LENGTH) return t;
  const cut = t.slice(0, MAX_CATEGORY_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > MAX_CATEGORY_LENGTH * 0.6) {
    return cut.slice(0, lastSpace).trimEnd();
  }
  return cut.trimEnd();
}

export function sanitizeCategory(value: string | null | undefined): string | null {
  const t = value?.trim();
  if (!t || isBadCategory(t)) return null;
  return truncateCategory(t);
}

export function displayCategory(value: string | null | undefined): string {
  const normalized = sanitizeCategory(value);
  if (normalized) return normalized;
  const t = value?.trim();
  if (t && !isBadCategory(t)) return truncateCategory(t);
  return "—";
}
