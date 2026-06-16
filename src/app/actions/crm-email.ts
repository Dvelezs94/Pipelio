"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  generateColdEmail,
  reviseEmailWithPrompt,
  type ConversationMessageInput,
} from "@/lib/deepseek";
import { getProposalSender } from "@/app/actions/proposal-sender";
import { sendMail } from "@/lib/mail";
import { renderTemplate, buildTemplateVars } from "@/lib/email-templates";
import { formatInboxBodyForDisplay } from "@/lib/email-parse";
import { getSmtpConfig, describeSmtpConfigGaps } from "@/app/actions/smtp-config";
import { requireWorkspaceId } from "@/lib/workspace";

async function getTemplateVarsForBusiness(business: {
  name: string;
  industry: string | null;
  website: string | null;
}) {
  const [sender, smtp] = await Promise.all([getProposalSender(), getSmtpConfig()]);
  return buildTemplateVars(business, sender, {
    fromName: smtp.fromName,
    fromEmail: smtp.fromEmail,
  });
}

function normalizeMessageId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("<") ? trimmed : `<${trimmed}>`;
}

function stripReplyPrefix(subject: string): string {
  return subject.replace(/^(re:\s*|fwd:\s*)+/i, "").trim();
}

function buildReplySubject(threadRootSubject: string | null | undefined, fallback: string): string {
  const base = stripReplyPrefix(threadRootSubject?.trim() || fallback);
  return base ? `Re: ${base}` : "Re: Follow up";
}

/** Last message in the lead thread + full References chain for SMTP threading. */
async function getLeadEmailThreadHeaders(crmLeadId: string): Promise<{
  inReplyTo?: string;
  references?: string;
  threadRootSubject: string | null;
}> {
  type SentThreadRow = {
    messageId: string | null;
    subject: string | null;
    sentAt: Date | null;
  };
  type InboxThreadRow = {
    messageId: string;
    subject: string | null;
    receivedAt: Date;
  };

  const [sent, inbox] = await Promise.all([
    prisma.crmEmail.findMany({
      where: { crmLeadId, sendStatus: "sent", messageId: { not: null } },
      orderBy: { sentAt: "asc" },
      select: { messageId: true, subject: true, sentAt: true },
    }) as Promise<SentThreadRow[]>,
    prisma.crmInboxMessage.findMany({
      where: { crmLeadId },
      orderBy: { receivedAt: "asc" },
      select: { messageId: true, subject: true, receivedAt: true },
    }) as Promise<InboxThreadRow[]>,
  ]);

  const merged = [
    ...sent.map((e: SentThreadRow) => ({
      messageId: e.messageId!,
      subject: e.subject,
      at: e.sentAt!,
    })),
    ...inbox.map((m: InboxThreadRow) => ({
      messageId: m.messageId,
      subject: m.subject,
      at: m.receivedAt,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  if (merged.length === 0) {
    return { threadRootSubject: null };
  }

  const ids = merged.map((m) => normalizeMessageId(m.messageId));
  const last = merged[merged.length - 1];

  return {
    inReplyTo: normalizeMessageId(last.messageId),
    references: ids.join(" "),
    threadRootSubject: merged[0].subject,
  };
}

function renderEmailContent(
  subject: string | null,
  body: string,
  vars: ReturnType<typeof buildTemplateVars>,
  options?: { defaultSubject?: string }
): { subject: string | null; body: string } {
  return {
    subject: subject
      ? renderTemplate(subject, vars)
      : options?.defaultSubject ?? null,
    body: renderTemplate(body, vars),
  };
}
export type CrmEmailActionResult = { success: true; data?: unknown } | { success: false; error: string };

export type CrmEmailRow = {
  id: string;
  crmLeadId: string;
  type: string;
  channel: string;
  language: string;
  subject: string | null;
  body: string;
  recipient: string | null;
  sentAt: Date | null;
  sendStatus: string | null;
  sendError: string | null;
  createdAt: Date;
  updatedAt: Date;
  revisionCount?: number;
};

export type CrmEmailRevisionRow = {
  id: string;
  subject: string | null;
  body: string;
  source: string;
  createdAt: Date;
};

export type CrmInboxRow = {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  bodyText: string | null;
  receivedAt: Date;
};

type CrmEmailWithRevisionCount = {
  id: string;
  crmLeadId: string;
  type: string;
  channel: string;
  language: string;
  subject: string | null;
  body: string;
  recipient: string | null;
  sentAt: Date | null;
  sendStatus: string | null;
  sendError: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { revisions: number };
};

type CrmEmailRevisionRecord = {
  id: string;
  subject: string | null;
  body: string;
  source: string;
  createdAt: Date;
};

type CrmInboxMessageRecord = {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  bodyText: string | null;
  receivedAt: Date;
};

/** Render a template for a lead without saving (for compose prefill). */
export async function previewEmailTemplate(
  crmLeadId: string,
  templateId: string
): Promise<
  | { success: true; data: { subject: string | null; body: string; type: string; channel: string; language: string } }
  | { success: false; error: string }
> {
  try {
    const [lead, template] = await Promise.all([
      prisma.crmLead.findUnique({ where: { id: crmLeadId }, include: { business: true } }),
      prisma.crmEmailTemplate.findUnique({ where: { id: templateId } }),
    ]);
    if (!lead) return { success: false, error: "Lead not found." };
    if (!template) return { success: false, error: "Template not found." };

    const vars = await getTemplateVarsForBusiness(lead.business);
    const { subject, body } = renderEmailContent(template.subjectTemplate, template.bodyTemplate, vars);
    return {
      success: true,
      data: {
        subject,
        body,
        type: template.type,
        channel: template.channel,
        language: template.language,
      },
    };
  } catch (e) {
    console.error("previewEmailTemplate", e);
    return { success: false, error: "Failed to load template." };
  }
}

/** Create or update a draft from the compose box. */
export async function upsertComposeEmail(
  crmLeadId: string,
  data: {
    draftId?: string | null;
    subject: string | null;
    body: string;
    type: string;
    language: string;
    channel: string;
  }
): Promise<CrmEmailActionResult & { data?: { id: string } }> {
  try {
    const payload = {
      subject: data.subject?.trim() || null,
      body: data.body.trim(),
      channel: data.channel,
      language: data.language,
      type: data.type,
    };

    if (data.draftId) {
      const existing = await prisma.crmEmail.findFirst({
        where: { id: data.draftId, crmLeadId },
      });
      if (existing) {
        await prisma.crmEmail.update({
          where: { id: existing.id },
          data: payload,
        });
        await prisma.crmEmailRevision.create({
          data: { crmEmailId: existing.id, subject: payload.subject, body: payload.body, source: "user" },
        });
        return { success: true, data: { id: existing.id } };
      }
    }

    const byType = await prisma.crmEmail.findFirst({
      where: { crmLeadId, type: data.type, sendStatus: { not: "sent" } },
    });
    if (byType) {
      await prisma.crmEmail.update({
        where: { id: byType.id },
        data: payload,
      });
      await prisma.crmEmailRevision.create({
        data: { crmEmailId: byType.id, subject: payload.subject, body: payload.body, source: "user" },
      });
      return { success: true, data: { id: byType.id } };
    }

    const email = await prisma.crmEmail.create({
      data: { crmLeadId, ...payload },
    });
    await prisma.crmEmailRevision.create({
      data: { crmEmailId: email.id, subject: payload.subject, body: payload.body, source: "user" },
    });
    return { success: true, data: { id: email.id } };
  } catch (e) {
    console.error("upsertComposeEmail", e);
    return { success: false, error: "Failed to save draft." };
  }
}

/** Apply a stored template to a lead and save as CrmEmail. */
export async function applyEmailTemplate(
  crmLeadId: string,
  templateId: string
): Promise<CrmEmailActionResult> {
  try {
    const [lead, template] = await Promise.all([
      prisma.crmLead.findUnique({ where: { id: crmLeadId }, include: { business: true } }),
      prisma.crmEmailTemplate.findUnique({ where: { id: templateId } }),
    ]);
    if (!lead) return { success: false, error: "Lead not found." };
    if (!template) return { success: false, error: "Template not found." };

    const vars = await getTemplateVarsForBusiness(lead.business);
    const { subject, body } = renderEmailContent(template.subjectTemplate, template.bodyTemplate, vars);

    const existing = await prisma.crmEmail.findFirst({
      where: { crmLeadId, type: template.type },
    });

    if (existing) {
      await prisma.crmEmail.update({
        where: { id: existing.id },
        data: { subject, body, channel: template.channel, language: template.language },
      });
      await prisma.crmEmailRevision.create({
        data: { crmEmailId: existing.id, subject, body, source: "user" },
      });
      revalidatePath("/crm");
      return { success: true, data: { id: existing.id, subject, body } };
    }

    const email = await prisma.crmEmail.create({
      data: {
        crmLeadId,
        type: template.type,
        channel: template.channel,
        language: template.language,
        subject,
        body,
      },
    });
    await prisma.crmEmailRevision.create({
      data: { crmEmailId: email.id, subject, body, source: "user" },
    });
    revalidatePath("/crm");
    return { success: true, data: { id: email.id, subject, body } };
  } catch (e) {
    console.error("applyEmailTemplate", e);
    return { success: false, error: "Failed to apply template." };
  }
}

/** Generate cold message with DeepSeek, save to CrmEmail. */
export async function generateCrmEmail(
  crmLeadId: string,
  emailType: string,
  language: string = "en",
  channel: "email" | "whatsapp" | "linkedin" = "email",
  options?: {
    previewOnly?: boolean;
    conversationHistory?: ConversationMessageInput[];
    quickPrompt?: string | null;
  }
): Promise<CrmEmailActionResult> {
  try {
    const lead = await prisma.crmLead.findUnique({
      where: { id: crmLeadId },
      include: { business: true },
    });
    if (!lead) return { success: false, error: "Lead not found." };

    const sender = await getProposalSender();
    const result = await generateColdEmail({
      businessName: lead.business.name,
      industry: lead.business.industry,
      emailType,
      website: lead.business.website,
      language,
      sender: sender.yourName || sender.yourTitle || sender.yourEmail || sender.yourPhone || sender.yourWebsite ? sender : null,
      channel,
      customContext: sender.aiDraftContext,
      quickPrompt: options?.quickPrompt,
      conversationHistory: options?.conversationHistory,
    });

    if (!result.ok) return { success: false, error: result.error };

    if (options?.previewOnly) {
      return { success: true, data: { subject: result.subject, body: result.body } };
    }

    const existing = await prisma.crmEmail.findFirst({
      where: { crmLeadId, type: emailType },
    });

    if (existing) {
      await prisma.crmEmail.update({
        where: { id: existing.id },
        data: {
          subject: result.subject,
          body: result.body,
          channel,
          language,
        },
      });
      await prisma.crmEmailRevision.create({
        data: {
          crmEmailId: existing.id,
          subject: result.subject,
          body: result.body,
          source: "ai",
        },
      });
      revalidatePath("/crm");
      return { success: true, data: { id: existing.id, subject: result.subject, body: result.body } };
    }

    const email = await prisma.crmEmail.create({
      data: {
        crmLeadId,
        type: emailType,
        channel,
        language,
        subject: result.subject,
        body: result.body,
      },
    });
    await prisma.crmEmailRevision.create({
      data: {
        crmEmailId: email.id,
        subject: result.subject,
        body: result.body,
        source: "ai",
      },
    });
    revalidatePath("/crm");
    return { success: true, data: { id: email.id, subject: result.subject, body: result.body } };
  } catch (e) {
    console.error("generateCrmEmail", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to generate email." };
  }
}

/** Send a saved CRM email via SMTP. */
export async function sendCrmEmail(
  crmEmailId: string,
  recipient: string
): Promise<CrmEmailActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    const email = await prisma.crmEmail.findFirst({
      where: {
        id: crmEmailId,
        crmLead: { business: { workspaceId } },
      },
      include: { crmLead: { include: { business: true } } },
    });
    if (!email) return { success: false, error: "Email not found." };
    if (email.channel !== "email") {
      return { success: false, error: "Only email channel messages can be sent via SMTP." };
    }

    const to = recipient.trim();
    if (!to) return { success: false, error: "Recipient email is required." };

    const smtpStatus = await getSmtpConfig();
    if (describeSmtpConfigGaps(smtpStatus).length > 0) {
      return {
        success: false,
        error:
          "SMTP is not configured for this business. Open CRM → Settings → Mail server and save your SMTP details.",
      };
    }

    const vars = await getTemplateVarsForBusiness(email.crmLead.business);
    const { subject, body } = renderEmailContent(email.subject, email.body, vars, {
      defaultSubject: "Follow up",
    });

    if (!vars.yourName.trim() || !vars.yourEmail.trim()) {
      return {
        success: false,
        error:
          "Fill in your name and email under CRM Settings → Your details (or set From name/email in Mail server).",
      };
    }

    const sendSubject = subject ?? "Follow up";
    const thread = await getLeadEmailThreadHeaders(email.crmLeadId);
    const threadedSubject = thread.inReplyTo
      ? buildReplySubject(thread.threadRootSubject, sendSubject)
      : sendSubject;

    const result = await sendMail({
      to,
      subject: threadedSubject,
      text: body,
      inReplyTo: thread.inReplyTo,
      references: thread.references,
    });

    if (!result.ok) {
      await prisma.crmEmail.update({
        where: { id: crmEmailId },
        data: { sendStatus: "failed", sendError: result.error, recipient: to, subject: threadedSubject, body },
      });
      return { success: false, error: result.error };
    }

    await prisma.crmEmail.update({
      where: { id: crmEmailId },
      data: {
        recipient: to,
        subject: threadedSubject,
        body,
        sentAt: new Date(),
        sendStatus: "sent",
        sendError: null,
        messageId: result.messageId,
      },
    });

    await prisma.crmLead.update({
      where: { id: email.crmLeadId },
      data: { contactEmail: to, status: email.crmLead.status === "new" ? "contacted" : email.crmLead.status },
    });

    revalidatePath("/crm");
    return { success: true, data: { messageId: result.messageId } };
  } catch (e) {
    console.error("sendCrmEmail", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}

export async function setLeadContactEmail(
  crmLeadId: string,
  contactEmail: string
): Promise<CrmEmailActionResult> {
  try {
    await prisma.crmLead.update({
      where: { id: crmLeadId },
      data: { contactEmail: contactEmail.trim() || null },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save contact email." };
  }
}

export async function reviseCrmEmailWithAi(
  crmEmailId: string,
  userPrompt: string
): Promise<CrmEmailActionResult> {
  try {
    const email = await prisma.crmEmail.findUnique({ where: { id: crmEmailId } });
    if (!email) return { success: false, error: "Email not found." };

    const result = await reviseEmailWithPrompt({
      subject: email.subject,
      body: email.body,
      userPrompt: userPrompt.trim() || "Improve this message.",
    });

    if (!result.ok) return { success: false, error: result.error };

    await prisma.crmEmail.update({
      where: { id: crmEmailId },
      data: { subject: result.subject, body: result.body },
    });
    await prisma.crmEmailRevision.create({
      data: {
        crmEmailId,
        subject: result.subject,
        body: result.body,
        source: "ai",
      },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("reviseCrmEmailWithAi", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to revise email." };
  }
}

export async function updateCrmEmail(
  crmEmailId: string,
  data: { subject?: string | null; body?: string }
): Promise<CrmEmailActionResult> {
  try {
    const email = await prisma.crmEmail.findUnique({ where: { id: crmEmailId } });
    if (!email) return { success: false, error: "Email not found." };

    const subject = data.subject !== undefined ? data.subject : email.subject;
    const body = data.body !== undefined ? data.body : email.body;

    await prisma.crmEmail.update({
      where: { id: crmEmailId },
      data: { subject, body },
    });
    await prisma.crmEmailRevision.create({
      data: { crmEmailId, subject, body, source: "user" },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("updateCrmEmail", e);
    return { success: false, error: "Failed to update email." };
  }
}

export async function deleteCrmEmail(crmEmailId: string): Promise<CrmEmailActionResult> {
  try {
    await prisma.crmEmail.delete({ where: { id: crmEmailId } });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("deleteCrmEmail", e);
    return { success: false, error: "Failed to delete email." };
  }
}

export async function getCrmEmailsForLead(crmLeadId: string): Promise<CrmEmailRow[]> {
  const emails = (await prisma.crmEmail.findMany({
    where: { crmLeadId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { revisions: true } } },
  })) as CrmEmailWithRevisionCount[];

  return emails.map((e: CrmEmailWithRevisionCount) => ({
    id: e.id,
    crmLeadId: e.crmLeadId,
    type: e.type,
    channel: e.channel,
    language: e.language,
    subject: e.subject,
    body: e.body,
    recipient: e.recipient,
    sentAt: e.sentAt,
    sendStatus: e.sendStatus,
    sendError: e.sendError,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    revisionCount: e._count.revisions,
  }));
}

export async function getCrmEmailRevisions(crmEmailId: string): Promise<CrmEmailRevisionRow[]> {
  const revs = (await prisma.crmEmailRevision.findMany({
    where: { crmEmailId },
    orderBy: { createdAt: "desc" },
  })) as CrmEmailRevisionRecord[];

  return revs.map((r: CrmEmailRevisionRecord) => ({
    id: r.id,
    subject: r.subject,
    body: r.body,
    source: r.source,
    createdAt: r.createdAt,
  }));
}

export async function getCrmInboxForLead(crmLeadId: string): Promise<CrmInboxRow[]> {
  const rows = (await prisma.crmInboxMessage.findMany({
    where: { crmLeadId },
    orderBy: { receivedAt: "desc" },
    take: 20,
  })) as CrmInboxMessageRecord[];

  return rows.map((r: CrmInboxMessageRecord) => ({
    id: r.id,
    fromEmail: r.fromEmail,
    fromName: r.fromName,
    subject: r.subject,
    bodyText: formatInboxBodyForDisplay(r.bodyText) || r.bodyText,
    receivedAt: r.receivedAt,
  }));
}

/** Mark all inbox messages for a lead as read (updates conversation badge). */
export async function markLeadInboxRead(crmLeadId: string): Promise<CrmEmailActionResult> {
  try {
    await prisma.crmLead.update({
      where: { id: crmLeadId },
      data: { inboxLastReadAt: new Date() },
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to mark as read." };
  }
}
