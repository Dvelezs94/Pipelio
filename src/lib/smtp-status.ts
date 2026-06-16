import type { AuthMethod, ConnectionSecurity } from "@/lib/mail-config";

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

export function describeImapConfigGaps(row: SmtpConfigRow): string[] {
  const gaps: string[] = [];
  if (!row.imapHost?.trim() && !row.host?.trim()) gaps.push("IMAP host (or SMTP host)");
  const username = row.imapUsername?.trim() || row.username?.trim();
  const password = row.imapPassword?.trim() || row.password?.trim();
  if (!username) gaps.push("IMAP username (or SMTP username)");
  if (!password) gaps.push("IMAP password (or SMTP password)");
  return gaps;
}

export function isSmtpConfigured(row: SmtpConfigRow): boolean {
  return describeSmtpConfigGaps(row).length === 0;
}
