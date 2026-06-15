"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-templates";
import { requireWorkspaceId } from "@/lib/workspace";

export type EmailTemplateRow = {
  id: string;
  name: string;
  type: string;
  channel: string;
  language: string;
  subjectTemplate: string | null;
  bodyTemplate: string;
  isDefault: boolean;
};

export type ActionResult = { success: true; data?: unknown } | { success: false; error: string };

async function ensureDefaultTemplates(workspaceId: string): Promise<void> {
  const count = await prisma.crmEmailTemplate.count({ where: { workspaceId } });
  if (count > 0) return;
  await prisma.crmEmailTemplate.createMany({
    data: DEFAULT_EMAIL_TEMPLATES.map((t) => ({
      workspaceId,
      name: t.name,
      type: t.type,
      channel: t.channel,
      language: t.language,
      subjectTemplate: t.subjectTemplate,
      bodyTemplate: t.bodyTemplate,
      isDefault: t.isDefault,
    })),
  });
}

export async function getEmailTemplates(): Promise<EmailTemplateRow[]> {
  const workspaceId = await requireWorkspaceId();
  await ensureDefaultTemplates(workspaceId);
  const rows = await prisma.crmEmailTemplate.findMany({
    where: { workspaceId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    channel: r.channel,
    language: r.language,
    subjectTemplate: r.subjectTemplate,
    bodyTemplate: r.bodyTemplate,
    isDefault: r.isDefault,
  }));
}

export async function saveEmailTemplate(data: {
  id?: string;
  name: string;
  type: string;
  channel: string;
  language: string;
  subjectTemplate?: string | null;
  bodyTemplate: string;
}): Promise<ActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    if (data.id) {
      await prisma.crmEmailTemplate.updateMany({
        where: { id: data.id, workspaceId },
        data: {
          name: data.name,
          type: data.type,
          channel: data.channel,
          language: data.language,
          subjectTemplate: data.subjectTemplate ?? null,
          bodyTemplate: data.bodyTemplate,
        },
      });
    } else {
      await prisma.crmEmailTemplate.create({
        data: {
          workspaceId,
          name: data.name,
          type: data.type,
          channel: data.channel,
          language: data.language,
          subjectTemplate: data.subjectTemplate ?? null,
          bodyTemplate: data.bodyTemplate,
        },
      });
    }
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("saveEmailTemplate", e);
    return { success: false, error: "Failed to save template." };
  }
}

export async function deleteEmailTemplate(id: string): Promise<ActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    await prisma.crmEmailTemplate.deleteMany({ where: { id, workspaceId } });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("deleteEmailTemplate", e);
    return { success: false, error: "Failed to delete template." };
  }
}
