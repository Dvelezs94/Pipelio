import {
  daysSinceLastMessage,
  daysSinceLastMessageColorClass,
  formatDaysSinceLastMessage,
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
  const label = formatDaysSinceLastMessage(days);

  return (
    <p className={cn("text-[11px] leading-tight", daysSinceLastMessageColorClass(days), className)}>
      {label}
    </p>
  );
}
