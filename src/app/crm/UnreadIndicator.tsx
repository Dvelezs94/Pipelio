import { cn } from "@/lib/utils";

export function UnreadIndicator({
  count,
  className,
  compact,
}: {
  count: number;
  className?: string;
  compact?: boolean;
}) {
  if (count <= 0) return null;

  if (compact) {
    return (
      <span
        className={cn("inline-block h-2 w-2 shrink-0 rounded-full bg-primary", className)}
        title={`${count} unread message${count !== 1 ? "s" : ""}`}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium min-w-[1.25rem] h-5 px-1.5",
        className
      )}
      title={`${count} unread message${count !== 1 ? "s" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
