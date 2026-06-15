"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "visited-business-ids";
const LAST_VISITED_KEY = "last-visited-business-id";

export function readVisitedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function persistVisitedIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function readLastVisitedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(LAST_VISITED_KEY);
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export function persistLastVisitedId(id: string): void {
  localStorage.setItem(LAST_VISITED_KEY, id);
}

/** Most recently viewed business from DB timestamps (fallback when localStorage is empty). */
export function pickLastVisitedFromBusinesses(
  businesses: { id: string; viewedAt?: string | Date | null }[]
): string | null {
  let best: { id: string; t: number } | null = null;
  for (const b of businesses) {
    if (!b.viewedAt) continue;
    const t = new Date(b.viewedAt).getTime();
    if (!best || t > best.t) best = { id: b.id, t };
  }
  return best?.id ?? null;
}

export function useVisitedBusinesses() {
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null);

  useEffect(() => {
    setVisitedIds(readVisitedIds());
    setLastVisitedId(readLastVisitedId());
  }, []);

  const markVisited = useCallback((id: string) => {
    setVisitedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistVisitedIds(next);
      return next;
    });
    setLastVisitedId(id);
    persistLastVisitedId(id);
  }, []);

  const isVisited = useCallback((id: string) => visitedIds.includes(id), [visitedIds]);
  const isLastVisited = useCallback((id: string) => lastVisitedId === id, [lastVisitedId]);

  return { markVisited, isVisited, lastVisitedId, isLastVisited };
}

/** Accordion item highlight for visited businesses */
export function visitedItemClasses(visited: boolean, isLast = false): string {
  if (isLast) {
    return "border-l-[#f59e0b] bg-[color-mix(in_srgb,#f59e0b_32%,var(--card))]";
  }
  return visited
    ? "border-l-primary bg-[color-mix(in_srgb,var(--primary)_28%,var(--card))]"
    : "border-l-transparent";
}
