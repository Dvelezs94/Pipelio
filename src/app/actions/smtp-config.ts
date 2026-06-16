"use server";

import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { testSmtpConnection } from "@/lib/mail";
import { imapSettingsFromConfig, syncInboxMessages, testImapConnection } from "@/lib/imap";
import {
  type AuthMethod,
  type ConnectionSecurity,
  imapSecurityToLegacy,
  legacyImapSecurity,
  legacySmtpSecurity,
  smtpSecurityToLegacy,
} from "@/lib/mail-config";

export type SmtpConfigRow = {
  host: string | null;
  port: number;
  secure: boolean;
  smtpSecurity: ConnectionSecurity;
  smtpAuth: AuthMethod;
  username: string | null;
  password: string | null;
  fromEmail: string | null;
  fromName: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  imapSecurity: ConnectionSecurity;
  imapUsername: string | null;
  imapPassword: string | null;
  inboxLastSyncedAt: string | null;
};

export type ActionResult = { success: true; data?: unknown } | { success: false; error: string };

/** Merge form values with saved config; keep stored passwords when the form leaves them blank. */
async function resolveSmtpConfig(formData?: SmtpConfigRow): Promise<SmtpConfigRow> {
  const saved = await getSmtpConfig();
  if (!formData) return saved;
  return {
    ...saved,
    ...formData,
    password: formData.password?.trim() || saved.password,
    imapPassword: formData.imapPassword?.trim() || saved.imapPassword,
  };
}

function smtpRequiredMissing(row: SmtpConfigRow): boolean {
  return describeSmtpConfigGaps(row).length > 0;
}

/** Human-readable list of missing SMTP fields for the active business. */
export function describeSmtpConfigGaps(row: SmtpConfigRow): string[] {
  const gaps: string[] = [];
  if (!row.host?.trim()) gaps.push("SMTP host");
  if (!row.fromEmail?.trim()) gaps.push("from email");
  if (row.smtpAuth !== "none") {
    if (!row.username?.trim()) gaps.push("username");
    if (!row.password?.trim()) gaps.push("password");
  }
  return gaps;
}

export function isSmtpConfigured(row: SmtpConfigRow): boolean {
  return !smtpRequiredMissing(row);
}

export function describeImapConfigGaps(row: SmtpConfigRow): string[] {
  const gaps: string[] = [];
  if (!row.imapHost?.trim() && !row.host?.trim()) gaps.push("IMAP host (or SMTP host)");
  const username = row.imapUsername?.trim() || row.username?.trim();
  const password = row.imapPassword?.trim() || row.password?.trim();
  if (!username) gaps.push("IMAP username (or SMTP username)");
  if (!password) gaps.push("IMAP password (or SMTP password)");
  return gaps;
}

export async function getSmtpConfigStatus(): Promise<{ configured: boolean; issues: string[] }> {
  const row = await getSmtpConfig();
  const issues = describeSmtpConfigGaps(row);
  return { configured: issues.length === 0, issues };
}

export async function getSmtpConfig(): Promise<SmtpConfigRow> {
  const workspaceId = await requireWorkspaceId();
  const row = await prisma.smtpConfig.findUnique({ where: { workspaceId } });
  const smtpSecurity = (row?.smtpSecurity ?? legacySmtpSecurity(row?.secure ?? false)) as ConnectionSecurity;
  const imapSecurity = (row?.imapSecurity ?? legacyImapSecurity(row?.imapSecure ?? true)) as ConnectionSecurity;
  return {
    host: row?.host ?? null,
    port: row?.port ?? 587,
    secure: row?.secure ?? smtpSecurityToLegacy(smtpSecurity),
    smtpSecurity,
    smtpAuth: (row?.smtpAuth ?? "plain") as AuthMethod,
    username: row?.username ?? null,
    password: row?.password ?? null,
    fromEmail: row?.fromEmail ?? null,
    fromName: row?.fromName ?? null,
    imapHost: row?.imapHost ?? null,
    imapPort: row?.imapPort ?? 993,
    imapSecure: row?.imapSecure ?? imapSecurityToLegacy(imapSecurity),
    imapSecurity,
    imapUsername: row?.imapUsername ?? null,
    imapPassword: row?.imapPassword ?? null,
    inboxLastSyncedAt: row?.inboxLastSyncedAt?.toISOString() ?? null,
  };
}

export async function setSmtpConfig(data: SmtpConfigRow): Promise<ActionResult> {
  try {
    const workspaceId = await requireWorkspaceId();
    const existing = await prisma.smtpConfig.findUnique({ where: { workspaceId } });
    const password = data.password?.trim() || existing?.password?.trim() || null;
    const imapPassword = data.imapPassword?.trim() || existing?.imapPassword?.trim() || null;

    if (!data.host?.trim() || !data.fromEmail?.trim()) {
      return { success: false, error: "Fill in SMTP host and from email before saving." };
    }
    if (data.smtpAuth !== "none" && (!data.username?.trim() || !password)) {
      return {
        success: false,
        error: "Fill in username and password, or set authentication to None.",
      };
    }

    const secure = smtpSecurityToLegacy(data.smtpSecurity);
    const imapSecure = imapSecurityToLegacy(data.imapSecurity);

    await prisma.smtpConfig.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        host: data.host.trim(),
        port: data.port,
        secure,
        smtpSecurity: data.smtpSecurity,
        smtpAuth: data.smtpAuth,
        username: data.username?.trim() || null,
        password,
        fromEmail: data.fromEmail.trim(),
        fromName: data.fromName?.trim() || null,
        imapHost: data.imapHost?.trim() || null,
        imapPort: data.imapPort,
        imapSecure,
        imapSecurity: data.imapSecurity,
        imapUsername: data.imapUsername?.trim() || null,
        imapPassword: data.imapPassword?.trim() || null,
      },
      update: {
        host: data.host.trim(),
        port: data.port,
        secure,
        smtpSecurity: data.smtpSecurity,
        smtpAuth: data.smtpAuth,
        username: data.username?.trim() || null,
        password,
        fromEmail: data.fromEmail.trim(),
        fromName: data.fromName?.trim() || null,
        imapHost: data.imapHost?.trim() || null,
        imapPort: data.imapPort,
        imapSecure,
        imapSecurity: data.imapSecurity,
        imapUsername: data.imapUsername?.trim() || null,
        imapPassword,
      },
    });
    revalidatePath("/crm");
    return { success: true };
  } catch (e) {
    console.error("setSmtpConfig", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to save mail settings." };
  }
}

export async function testEmailConfig(formData?: SmtpConfigRow): Promise<ActionResult> {
  const row = await resolveSmtpConfig(formData);
  const errors: string[] = [];

  const smtpGaps = describeSmtpConfigGaps(row);
  if (smtpGaps.length > 0) {
    errors.push(`SMTP: missing ${smtpGaps.join(", ")}.`);
  } else {
    const smtpResult = await testSmtpConnection({
      host: row.host!.trim(),
      port: row.port,
      security: row.smtpSecurity,
      authMethod: row.smtpAuth,
      username: row.username?.trim() ?? "",
      password: row.password?.trim() ?? "",
      fromEmail: row.fromEmail!.trim(),
      fromName: row.fromName?.trim() || null,
    });
    if (!smtpResult.ok) errors.push(`SMTP: ${smtpResult.error}`);
  }

  const imapGaps = describeImapConfigGaps(row);
  if (imapGaps.length > 0) {
    errors.push(`IMAP: missing ${imapGaps.join(", ")}.`);
  } else {
    const imapSettings = imapSettingsFromConfig(row);
    if (!imapSettings) {
      errors.push("IMAP: could not resolve connection settings.");
    } else {
      const imapResult = await testImapConnection(imapSettings);
      if (!imapResult.ok) errors.push(`IMAP: ${imapResult.error}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join("\n\n") };
  }
  return { success: true, data: "SMTP and IMAP connections successful." };
}

export async function syncCrmInbox(formData?: SmtpConfigRow): Promise<ActionResult> {
  const row = await resolveSmtpConfig(formData);
  const result = await syncInboxMessages(row);
  if (!result.ok) return { success: false, error: result.error };
  revalidatePath("/crm");
  return { success: true, data: { imported: result.imported } };
}
