"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CRM_LEAD_STATUS_VALUES } from "@/lib/crm-statuses";
import { ensureManualZipSearch, manualZipSearchId, requireWorkspaceId } from "@/lib/workspace";

export type CrmActionResult = { success: true; data?: { leadId: string } } | { success: false; error: string };

function countUnreadInbox(
  inbox: { receivedAt: Date }[],
  inboxLastReadAt: Date | null | undefined
): number {
  if (inbox.length === 0) return 0;
  if (!inboxLastReadAt) return inbox.length;
  return inbox.filter((m) => m.receivedAt > inboxLastReadAt).length;
}


async function ensureManualZipSearchForCurrentWorkspace() {
  const workspaceId = await requireWorkspaceId();
  await ensureManualZipSearch(workspaceId);
  return { workspaceId, manualId: manualZipSearchId(workspaceId) };
}

export type ManualLeadInput = {
  name: string;
  website?: string | null;
  industry?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  size?: string | null;
  status?: string;
  initialNote?: string | null;
};

function extractDomain(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Create a CRM lead entered manually (not from search results). */
export async function createManualLead(input: ManualLeadInput): Promise<CrmActionResult> {
  const name = input.name?.trim();
  if (!name) return { success: false, error: "Company name is required." };

  const status = input.status?.trim() || "new";
  const validStatuses = CRM_LEAD_STATUS_VALUES;
  if (!validStatuses.includes(status)) {
    return { success: false, error: "Invalid status." };
  }

  try {
    const { workspaceId, manualId } = await ensureManualZipSearchForCurrentWorkspace();

    const placeId = `manual-${crypto.randomUUID()}`;
    const website = input.website?.trim() || null;
    const domain = extractDomain(website);

    const business = await prisma.business.create({
      data: {
        workspaceId,
        placeId,
        name,
        website,
        domain,
        industry: input.industry?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.contactEmail?.trim() || null,
        address: input.address?.trim() || null,
        size: input.size?.trim() || null,
        zipSearchId: manualId,
      },
    });

    const lead = await prisma.crmLead.create({
      data: {
        businessId: business.id,
        status,
        contactEmail: input.contactEmail?.trim() || null,
      },
    });

    const note = input.initialNote?.trim();
    if (note) {
      await prisma.crmNote.create({
        data: { crmLeadId: lead.id, content: note },
      });
    }

    revalidatePath("/crm");
    revalidatePath("/db");
    return { success: true, data: { leadId: lead.id } };
  } catch (e) {
    console.error("createManualLead", e);
    return { success: false, error: "Failed to create lead." };
  }
}

/** Add a business to the CRM. Idempotent: already saved is success. */
export async function saveToCrm(businessId: string): Promise<CrmActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    const business = await prisma.business.findFirst({ where: { id: businessId, workspaceId } });
    if (!business) return { success: false, error: "Business not found." };
    await prisma.crmLead.upsert({
      where: { businessId },
      create: { businessId, status: "new" },
      update: {},
    });
    revalidatePath("/crm");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("saveToCrm", e);
    return { success: false, error: "Failed to save to CRM." };
  }
}

/** Remove a business from the CRM. */
export async function removeFromCrm(businessId: string): Promise<CrmActionResult> {
  try {
    await prisma.crmLead.deleteMany({ where: { businessId } });
    revalidatePath("/crm");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    console.error("removeFromCrm", e);
    return { success: false, error: "Failed to remove from CRM." };
  }
}

/** Update lead status or notes. */
export async function updateCrmLead(
  businessId: string,
  data: { status?: string; notes?: string | null }
): Promise<CrmActionResult> {
  try {
    await prisma.crmLead.updateMany({
      where: { businessId },
      data: {
        ...(data.status != null && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("updateCrmLead", e);
    return { success: false, error: "Failed to update lead." };
  }
}

/** List business IDs that are in the CRM (for button state). */
export async function getCrmLeadIds(): Promise<string[]> {
  const workspaceId = await requireWorkspaceId();
  const leads = await prisma.crmLead.findMany({
    where: { business: { workspaceId } },
    select: { businessId: true },
  });
  return leads.map((l) => l.businessId);
}

export type CrmNoteRecord = {
  id: string;
  content: string;
  createdAt: Date;
};

export type CrmLeadWithBusiness = {
  id: string;
  businessId: string;
  status: string;
  sortOrder: number | null;
  notes: string | null;
  contactEmail: string | null;
  createdAt: Date;
  business: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    industry: string | null;
    size: string | null;
    rating: number | null;
    reviews: number;
    leadScore: number | null;
  };
  noteList: CrmNoteRecord[];
  unreadInboxCount: number;
};

/** List all CRM leads with business details and notes for the CRM page. Ordered by status, then sortOrder (nulls last), then createdAt. */
export async function getCrmLeads(): Promise<CrmLeadWithBusiness[]> {
  const workspaceId = await requireWorkspaceId();
  const leads = await prisma.crmLead.findMany({
    where: { business: { workspaceId } },
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          industry: true,
          size: true,
          rating: true,
          reviews: true,
          leadScore: true,
        },
      },
      noteList: {
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true },
      },
      inbox: { select: { receivedAt: true } },
    },
  });
  const typed = leads.map(({ inbox, inboxLastReadAt, ...lead }) => ({
    ...lead,
    unreadInboxCount: countUnreadInbox(inbox, inboxLastReadAt),
  })) as CrmLeadWithBusiness[];
  typed.sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    const ao = a.sortOrder ?? 1e9;
    const bo = b.sortOrder ?? 1e9;
    if (ao !== bo) return ao - bo;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return typed;
}

/** Move a lead to a new status and/or position. Updates status and sortOrder so the lead appears at newIndex in the column. */
export async function updateCrmLeadOrder(
  businessId: string,
  newStatus: string,
  newIndex: number
): Promise<CrmActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    const lead = await prisma.crmLead.findFirst({
      where: { businessId, business: { workspaceId } },
    });
    if (!lead) return { success: false, error: "Lead not found." };

    await prisma.crmLead.update({
      where: { businessId },
      data: { status: newStatus },
    });

    const inColumn = await prisma.crmLead.findMany({
      where: { status: newStatus, business: { workspaceId } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { businessId: true },
    });
    const ids = inColumn.map((l) => l.businessId);
    const fromIdx = ids.indexOf(businessId);
    if (fromIdx === -1) return { success: true };

    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    let insertAt = newIndex;
    if (fromIdx < newIndex) insertAt = newIndex - 1;
    insertAt = Math.max(0, Math.min(insertAt, reordered.length));
    reordered.splice(insertAt, 0, businessId);

    await Promise.all(
      reordered.map((bid, i) =>
        prisma.crmLead.updateMany({
          where: { businessId: bid },
          data: { sortOrder: i * 10 },
        })
      )
    );
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("updateCrmLeadOrder", e);
    return { success: false, error: "Failed to update order." };
  }
}

/** Add a note to a CRM lead. */
export async function addCrmNote(crmLeadId: string, content: string): Promise<CrmActionResult> {
  try {
    const trimmed = content?.trim();
    if (!trimmed) return { success: false, error: "Note content is required." };
    await prisma.crmNote.create({
      data: { crmLeadId, content: trimmed },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("addCrmNote", e);
    return { success: false, error: "Failed to add note." };
  }
}

/** Delete a note. */
export async function deleteCrmNote(noteId: string): Promise<CrmActionResult> {
  try {
    await prisma.crmNote.deleteMany({ where: { id: noteId } });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("deleteCrmNote", e);
    return { success: false, error: "Failed to delete note." };
  }
}
