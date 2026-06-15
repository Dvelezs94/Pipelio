import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { requireWorkspaceId } from "@/lib/workspace";
import {
  type AuthMethod,
  type ConnectionSecurity,
  legacySmtpSecurity,
} from "@/lib/mail-config";

export type SmtpSettings = {
  host: string;
  port: number;
  security: ConnectionSecurity;
  authMethod: AuthMethod;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
};

export function buildSmtpTransportOptions(settings: SmtpSettings): SMTPTransport.Options {
  const options: SMTPTransport.Options = {
    host: settings.host,
    port: settings.port,
    secure: settings.security === "ssl",
    requireTLS: settings.security === "starttls",
    ignoreTLS: settings.security === "none",
  };

  if (settings.authMethod !== "none") {
    options.auth = {
      user: settings.username,
      pass: settings.password,
    };
    if (settings.authMethod === "login") {
      options.authMethod = "LOGIN";
    } else if (settings.authMethod === "plain") {
      options.authMethod = "PLAIN";
    }
  }

  return options;
}

export async function getSmtpSettings(workspaceId?: string): Promise<SmtpSettings | null> {
  const wsId = workspaceId ?? (await requireWorkspaceId());
  const row = await prisma.smtpConfig.findUnique({ where: { workspaceId: wsId } });
  if (!row?.host || !row.fromEmail) return null;

  const authMethod = (row.smtpAuth ?? "plain") as AuthMethod;
  const security = (row.smtpSecurity ?? legacySmtpSecurity(row.secure)) as ConnectionSecurity;

  if (authMethod !== "none" && (!row.username || !row.password)) return null;

  return {
    host: row.host,
    port: row.port,
    security,
    authMethod,
    username: row.username ?? "",
    password: row.password ?? "",
    fromEmail: row.fromEmail,
    fromName: row.fromName,
  };
}

function createTransport(settings: SmtpSettings): Transporter {
  return nodemailer.createTransport(buildSmtpTransportOptions(settings));
}

export async function testSmtpConnection(
  settings: SmtpSettings
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transport = createTransport(settings);
    await transport.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMTP connection failed." };
  }
}

export type SendMailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
};

export async function sendMail(
  params: SendMailParams
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const settings = await getSmtpSettings();
  if (!settings) {
    return { ok: false, error: "SMTP is not configured. Add your mail server settings in CRM." };
  }

  try {
    const transport = createTransport(settings);
    const info = await transport.sendMail({
      from: settings.fromName
        ? `"${settings.fromName}" <${settings.fromEmail}>`
        : settings.fromEmail,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text.replace(/\n/g, "<br>"),
      inReplyTo: params.inReplyTo,
      references: params.references,
    });
    const messageId = (info.messageId as string | undefined) ?? `local-${Date.now()}`;
    return { ok: true, messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}
