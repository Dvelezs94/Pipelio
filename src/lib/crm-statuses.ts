/** CRM lead pipeline statuses (canvas columns, table, modal). */
export const CRM_LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "not_qualified", label: "Not qualified" },
  { value: "converted", label: "Converted" },
] as const;

export const CRM_LEAD_STATUS_VALUES: string[] = CRM_LEAD_STATUSES.map((s) => s.value);

export const CRM_LEAD_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  CRM_LEAD_STATUSES.map((s) => [s.value, s.label])
);

export function pipelineStatusLabel(
  columns: Array<{ value: string; label: string }>,
  status: string
): string {
  return columns.find((c) => c.value === status)?.label ?? CRM_LEAD_STATUS_LABEL[status] ?? status;
}
