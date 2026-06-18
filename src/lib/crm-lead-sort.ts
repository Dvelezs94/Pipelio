type CrmLeadSortFields = {
  sortOrder: number | null;
  createdAt: Date | string;
  unreadInboxCount?: number;
};

function bySortOrderThenCreated(a: CrmLeadSortFields, b: CrmLeadSortFields): number {
  const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/** Sort leads within a pipeline column: unread first, then manual order. */
export function sortCrmLeadsInColumn<T extends CrmLeadSortFields>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const aUnread = (a.unreadInboxCount ?? 0) > 0;
    const bUnread = (b.unreadInboxCount ?? 0) > 0;
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    return bySortOrderThenCreated(a, b);
  });
}

/** Sort all CRM leads for the table view: unread first, then status, then manual order. */
export function sortCrmLeadsForTable<T extends CrmLeadSortFields & { status: string }>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const aUnread = (a.unreadInboxCount ?? 0) > 0;
    const bUnread = (b.unreadInboxCount ?? 0) > 0;
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return bySortOrderThenCreated(a, b);
  });
}
