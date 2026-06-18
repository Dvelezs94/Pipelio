"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  ensureCrmPipelineColumns,
  seedDefaultPipelineColumns,
  uniqueColumnValue,
} from "@/lib/crm-pipeline";
import { requireWorkspaceId } from "@/lib/workspace";

export type CrmPipelineActionResult = { success: true } | { success: false; error: string };

export type CrmPipelineColumnRow = {
  value: string;
  label: string;
  sortOrder: number;
  leadCount: number;
};

export async function getCrmPipelineColumns(): Promise<CrmPipelineColumnRow[]> {
  const workspaceId = await requireWorkspaceId();
  await ensureCrmPipelineColumns(workspaceId);

  const columns = await prisma.crmPipelineColumn.findMany({
    where: { workspaceId },
    orderBy: { sortOrder: "asc" },
    select: { value: true, label: true, sortOrder: true },
  });

  const counts = await prisma.crmLead.groupBy({
    by: ["status"],
    where: { business: { workspaceId } },
    _count: { _all: true },
  });
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return columns.map((col) => ({
    ...col,
    leadCount: countByStatus[col.value] ?? 0,
  }));
}

export async function getWorkspacePipelineStatusValues(): Promise<string[]> {
  const cols = await getCrmPipelineColumns();
  return cols.map((c) => c.value);
}

export async function createCrmPipelineColumn(label: string): Promise<CrmPipelineActionResult> {
  const trimmed = label?.trim();
  if (!trimmed) return { success: false, error: "Column name is required." };
  if (trimmed.length > 40) return { success: false, error: "Column name must be 40 characters or less." };

  try {
    const workspaceId = await requireWorkspaceId();
    await ensureCrmPipelineColumns(workspaceId);

    const maxOrder = await prisma.crmPipelineColumn.aggregate({
      where: { workspaceId },
      _max: { sortOrder: true },
    });
    const value = await uniqueColumnValue(workspaceId, trimmed);

    await prisma.crmPipelineColumn.create({
      data: {
        workspaceId,
        value,
        label: trimmed,
        sortOrder: (maxOrder._max.sortOrder ?? -10) + 10,
      },
    });

    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("createCrmPipelineColumn", e);
    return { success: false, error: "Failed to create column." };
  }
}

export async function updateCrmPipelineColumn(
  value: string,
  label: string
): Promise<CrmPipelineActionResult> {
  const trimmed = label?.trim();
  if (!trimmed) return { success: false, error: "Column name is required." };
  if (trimmed.length > 40) return { success: false, error: "Column name must be 40 characters or less." };

  try {
    const workspaceId = await requireWorkspaceId();
    const col = await prisma.crmPipelineColumn.findFirst({
      where: { workspaceId, value },
    });
    if (!col) return { success: false, error: "Column not found." };

    await prisma.crmPipelineColumn.update({
      where: { id: col.id },
      data: { label: trimmed },
    });

    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("updateCrmPipelineColumn", e);
    return { success: false, error: "Failed to rename column." };
  }
}

export async function reorderCrmPipelineColumns(
  orderedValues: string[]
): Promise<CrmPipelineActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    const columns = await prisma.crmPipelineColumn.findMany({
      where: { workspaceId },
      select: { id: true, value: true },
    });

    if (orderedValues.length !== columns.length) {
      return { success: false, error: "Invalid column order." };
    }

    const idByValue = new Map(columns.map((c) => [c.value, c.id]));
    for (const value of orderedValues) {
      if (!idByValue.has(value)) {
        return { success: false, error: "Invalid column." };
      }
    }

    await prisma.$transaction(
      orderedValues.map((value, index) =>
        prisma.crmPipelineColumn.update({
          where: { id: idByValue.get(value)! },
          data: { sortOrder: index * 10 },
        })
      )
    );

    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("reorderCrmPipelineColumns", e);
    return { success: false, error: "Failed to reorder columns." };
  }
}

export async function deleteCrmPipelineColumn(value: string): Promise<CrmPipelineActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    const col = await prisma.crmPipelineColumn.findFirst({
      where: { workspaceId, value },
    });
    if (!col) return { success: false, error: "Column not found." };

    const columnCount = await prisma.crmPipelineColumn.count({ where: { workspaceId } });
    if (columnCount <= 1) {
      return { success: false, error: "You must keep at least one column." };
    }

    const leadCount = await prisma.crmLead.count({
      where: { status: value, business: { workspaceId } },
    });
    if (leadCount > 0) {
      return {
        success: false,
        error: `This column has ${leadCount} lead${leadCount === 1 ? "" : "s"}. Move them before removing the column.`,
      };
    }

    await prisma.crmPipelineColumn.delete({ where: { id: col.id } });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("deleteCrmPipelineColumn", e);
    return { success: false, error: "Failed to remove column." };
  }
}

export { seedDefaultPipelineColumns };
