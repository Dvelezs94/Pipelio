import {
  daysSinceLastMessage,
  daysSinceLastMessageNumberColorClass,
  daysSinceLastMessageParts,
} from "@/lib/crm-last-message";
import { cn } from "@/lib/utils";

export function CrmLastMessageAge({
  lastMessageAt,
  className,
}: {
  lastMessageAt: string | null | undefined;
  className?: string;
}) {
  if (!lastMessageAt) return null;

  const days = daysSinceLastMessage(lastMessageAt);
  const { prefix, days: dayCount, suffix } = daysSinceLastMessageParts(days);

  return (
    <p className={cn("text-[11px] leading-tight text-muted-foreground", className)}>
      {prefix}
      {dayCount != null && (
        <>
          <span className={daysSinceLastMessageNumberColorClass(dayCount)}>{dayCount}</span>
          {suffix}
        </>
      )}
    </p>
  );
}
