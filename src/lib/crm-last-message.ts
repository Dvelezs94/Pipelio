const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysSinceLastMessage(lastMessageAt: Date | string, now = Date.now()): number {
  const then = new Date(lastMessageAt).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / MS_PER_DAY));
}

export function formatDaysSinceLastMessage(days: number): string {
  if (days === 0) return "Last message today";
  if (days === 1) return "1 day since last message";
  return `${days} days since last message`;
}

export type DaysSinceLastMessageParts = {
  prefix: string;
  days: number | null;
  suffix: string;
};

export function daysSinceLastMessageParts(days: number): DaysSinceLastMessageParts {
  if (days === 0) return { prefix: "Last message today", days: null, suffix: "" };
  if (days === 1) return { prefix: "", days: 1, suffix: " day since last message" };
  return { prefix: "", days, suffix: " days since last message" };
}

/** Color for the day count only — redder as days increase; red after 5 days. */
export function daysSinceLastMessageNumberColorClass(days: number): string {
  if (days <= 2) return "text-muted-foreground";
  if (days <= 3) return "text-amber-600 dark:text-amber-500";
  if (days <= 4) return "text-orange-500 dark:text-orange-400";
  if (days === 5) return "text-orange-600 dark:text-orange-500";
  if (days <= 9) return "text-red-500 dark:text-red-400";
  if (days <= 19) return "text-red-600 dark:text-red-500";
  return "text-red-700 dark:text-red-500 font-semibold";
}

export function lastMessageAtFromActivity(
  inbox: { receivedAt: Date }[],
  latestSentEmail: { sentAt: Date | null } | null | undefined
): Date | null {
  const dates: number[] = [];
  for (const message of inbox) dates.push(message.receivedAt.getTime());
  if (latestSentEmail?.sentAt) dates.push(latestSentEmail.sentAt.getTime());
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates));
}
