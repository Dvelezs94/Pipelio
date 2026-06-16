import { ImapFlow } from "imapflow";
import { prisma } from "@/lib/db";
import {
  type ConnectionSecurity,
  legacyImapSecurity,
} from "@/lib/mail-config";
import { cleanInboxBodyText, reparseStoredInboxBody } from "@/lib/email-parse";
import { requireWorkspaceId } from "@/lib/workspace";

export type ImapSettings = {
  host: string;
  port: number;
  security: ConnectionSecurity;
  username: string;
  password: string;
};

type MailConfigRow = {
  host: string | null;
  port: number;
  secure: boolean;
  smtpSecurity: string;
  smtpAuth: string;
  username: string | null;
  password: string | null;
  fromEmail: string | null;
  fromName: string | null;
  imapHost: string | null;
  imapPort: number;
  imapSecure: boolean;
  imapSecurity: string;
  imapUsername: string | null;
  imapPassword: string | null;
};

function resolveImapSecurity(row: MailConfigRow): ConnectionSecurity {
  if (row.imapSecurity) return row.imapSecurity as ConnectionSecurity;
  return legacyImapSecurity(row.imapSecure);
}

export function imapSettingsFromConfig(row: MailConfigRow): ImapSettings | null {
  const host = row.imapHost?.trim() || row.host?.trim();
  const username = row.imapUsername?.trim() || row.username?.trim();
  const password = row.imapPassword?.trim() || row.password?.trim();
  if (!host || !username || !password) return null;

  const security = resolveImapSecurity(row);
  return {
    host,
    port: row.imapPort ?? (security === "ssl" ? 993 : security === "starttls" ? 143 : 143),
    security,
    username,
    password,
  };
}

export async function getImapSettings(workspaceId?: string): Promise<ImapSettings | null> {
  const wsId = workspaceId ?? (await requireWorkspaceId());
  const row = await prisma.smtpConfig.findUnique({ where: { workspaceId: wsId } });
  if (!row) return null;
  return imapSettingsFromConfig(row as MailConfigRow);
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

/** Fix inbox rows that still store full raw MIME from earlier imports. */
async function reparseLegacyInboxBodies(workspaceId: string): Promise<number> {
  const rows = await prisma.crmInboxMessage.findMany({
    where: { workspaceId, bodyText: { not: null } },
    orderBy: { receivedAt: "desc" },
    take: 200,
    select: { id: true, bodyText: true },
  });

  let updated = 0;
  for (const row of rows) {
    const parsed = reparseStoredInboxBody(row.bodyText);
    if (!parsed) continue;
    await prisma.crmInboxMessage.update({
      where: { id: row.id },
      data: { bodyText: parsed },
    });
    updated += 1;
  }
  return updated;
}

export async function testImapConnection(
  settings: ImapSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = new ImapFlow({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "ssl",
    tls: settings.security === "starttls" ? { rejectUnauthorized: true } : undefined,
    auth: { user: settings.username, pass: settings.password },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
    await client.logout();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "IMAP connection failed." };
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}

export async function syncInboxMessages(
  config?: MailConfigRow,
  workspaceId?: string
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const wsId = workspaceId ?? (await requireWorkspaceId());
  const settings = config ? imapSettingsFromConfig(config) : await getImapSettings(wsId);
  if (!settings) {
    return { ok: false, error: "IMAP is not configured. Set IMAP host and credentials in CRM mail settings." };
  }

  const client = new ImapFlow({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "ssl",
    tls: settings.security === "starttls" ? { rejectUnauthorized: true } : undefined,
    auth: { user: settings.username, pass: settings.password },
    logger: false,
  });

  let imported = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      for await (const msg of client.fetch({ since }, { envelope: true, source: true, uid: true })) {
        const messageId = msg.envelope?.messageId;
        if (!messageId) continue;

        const exists = await prisma.crmInboxMessage.findFirst({
          where: { workspaceId: wsId, messageId },
        });
        if (exists) continue;

        const fromRaw = msg.envelope?.from?.[0];
        const fromEmail = fromRaw?.address
          ? fromRaw.address.toLowerCase()
          : extractEmailAddress(fromRaw?.name ?? "");
        if (!fromEmail) continue;

        const fromName = fromRaw?.name ?? null;
        const subject = msg.envelope?.subject ?? null;
        const receivedAt = msg.envelope?.date ?? new Date();
        const inReplyTo = msg.envelope?.inReplyTo ?? null;

        let bodyText: string | null = null;
        if (msg.source) {
          const raw = msg.source.toString("utf8");
          bodyText = cleanInboxBodyText(raw).slice(0, 50000) || null;
          if (!bodyText) {
            bodyText = raw.slice(0, 50000);
          }
        }

        const lead = await prisma.crmLead.findFirst({
          where: {
            business: { workspaceId: wsId },
            OR: [{ contactEmail: fromEmail }, { business: { email: fromEmail } }],
          },
          select: { id: true },
        });

        await prisma.crmInboxMessage.create({
          data: {
            workspaceId: wsId,
            messageId,
            fromEmail,
            fromName,
            subject,
            bodyText,
            receivedAt,
            inReplyTo,
            crmLeadId: lead?.id ?? null,
          },
        });
        imported += 1;
      }
    } finally {
      lock.release();
    }
    await client.logout();
    const reparsed = await reparseLegacyInboxBodies(wsId);
    if (reparsed > 0) {
      console.log(`[crm-inbox] reparsed ${reparsed} legacy message body(s)`);
    }
    const syncedAt = new Date();
    await prisma.smtpConfig
      .update({
        where: { workspaceId: wsId },
        data: { inboxLastSyncedAt: syncedAt },
      })
      .catch(() => {});
    return { ok: true, imported };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to sync inbox." };
  } finally {
    try {
      await client.logout();
    } catch {
      // ignore
    }
  }
}

/** Sync inbox for every workspace that has IMAP configured. */
export async function syncAllWorkspaceInboxes(): Promise<number> {
  const configs = await prisma.smtpConfig.findMany({
    select: {
      workspaceId: true,
      host: true,
      port: true,
      secure: true,
      smtpSecurity: true,
      smtpAuth: true,
      username: true,
      password: true,
      fromEmail: true,
      fromName: true,
      imapHost: true,
      imapPort: true,
      imapSecure: true,
      imapSecurity: true,
      imapUsername: true,
      imapPassword: true,
    },
  });

  let totalImported = 0;
  for (const config of configs) {
    if (!imapSettingsFromConfig(config as MailConfigRow)) continue;
    const result = await syncInboxMessages(config as MailConfigRow, config.workspaceId);
    if (result.ok) totalImported += result.imported;
  }
  return totalImported;
}
