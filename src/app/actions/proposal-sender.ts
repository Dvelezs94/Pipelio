"use server";

import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export type ProposalSenderRow = {
  yourName: string | null;
  yourTitle: string | null;
  yourEmail: string | null;
  yourPhone: string | null;
  yourWebsite: string | null;
  aiDraftContext: string | null;
};

export type ProposalSenderActionResult =
  | { success: true }
  | { success: false; error: string };

/** Get the stored sender details (single row). */
export async function getProposalSender(): Promise<ProposalSenderRow> {
  const workspaceId = await requireWorkspaceId();
  const row = await prisma.proposalSender.findUnique({
    where: { workspaceId },
  });
  return {
    yourName: row?.yourName ?? null,
    yourTitle: row?.yourTitle ?? null,
    yourEmail: row?.yourEmail ?? null,
    yourPhone: row?.yourPhone ?? null,
    yourWebsite: row?.yourWebsite ?? null,
    aiDraftContext: row?.aiDraftContext ?? null,
  };
}

/** Save sender details (creates or updates the single row). */
export async function setProposalSender(data: {
  yourName?: string | null;
  yourTitle?: string | null;
  yourEmail?: string | null;
  yourPhone?: string | null;
  yourWebsite?: string | null;
  aiDraftContext?: string | null;
}): Promise<ProposalSenderActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    await prisma.proposalSender.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        yourName: data.yourName ?? null,
        yourTitle: data.yourTitle ?? null,
        yourEmail: data.yourEmail ?? null,
        yourPhone: data.yourPhone ?? null,
        yourWebsite: data.yourWebsite ?? null,
        aiDraftContext: data.aiDraftContext ?? null,
      },
      update: {
        yourName: data.yourName ?? undefined,
        yourTitle: data.yourTitle ?? undefined,
        yourEmail: data.yourEmail ?? undefined,
        yourPhone: data.yourPhone ?? undefined,
        yourWebsite: data.yourWebsite ?? undefined,
        aiDraftContext: data.aiDraftContext ?? undefined,
      },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("setProposalSender", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save.",
    };
  }
}
