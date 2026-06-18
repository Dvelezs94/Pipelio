import { prisma } from "@/lib/db";
import { CRM_LEAD_STATUSES } from "@/lib/crm-statuses";

export function slugifyColumnValue(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "stage";
}

export async function seedDefaultPipelineColumns(workspaceId: string): Promise<void> {
  const existing = await prisma.crmPipelineColumn.count({ where: { workspaceId } });
  if (existing > 0) return;

  await prisma.crmPipelineColumn.createMany({
    data: CRM_LEAD_STATUSES.map((s, i) => ({
      workspaceId,
      value: s.value,
      label: s.label,
      sortOrder: i * 10,
    })),
  });
}

export async function ensureCrmPipelineColumns(workspaceId: string): Promise<void> {
  await seedDefaultPipelineColumns(workspaceId);
}

export async function uniqueColumnValue(
  workspaceId: string,
  label: string,
  excludeValue?: string
): Promise<string> {
  const existing = await prisma.crmPipelineColumn.findMany({
    where: { workspaceId },
    select: { value: true },
  });
  const taken = new Set(
    existing.map((c) => c.value).filter((v) => v !== excludeValue)
  );

  let base = slugifyColumnValue(label);
  let value = base;
  let n = 0;
  while (taken.has(value)) {
    n += 1;
    value = `${base}_${n}`;
  }
  return value;
}
