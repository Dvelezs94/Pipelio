export type ConnectionSecurity = "none" | "starttls" | "ssl";
export type AuthMethod = "none" | "plain" | "login";

export const SMTP_SECURITY_OPTIONS: { value: ConnectionSecurity; label: string }[] = [
  { value: "starttls", label: "STARTTLS (port 587)" },
  { value: "ssl", label: "SSL/TLS (port 465)" },
  { value: "none", label: "None (unencrypted)" },
];

export const IMAP_SECURITY_OPTIONS: { value: ConnectionSecurity; label: string }[] = [
  { value: "ssl", label: "SSL/TLS (port 993)" },
  { value: "starttls", label: "STARTTLS (port 143)" },
  { value: "none", label: "None (unencrypted)" },
];

export const AUTH_METHOD_OPTIONS: { value: AuthMethod; label: string }[] = [
  { value: "plain", label: "PLAIN" },
  { value: "login", label: "LOGIN" },
  { value: "none", label: "None" },
];

export function legacySmtpSecurity(secure: boolean): ConnectionSecurity {
  return secure ? "ssl" : "starttls";
}

export function legacyImapSecurity(imapSecure: boolean): ConnectionSecurity {
  return imapSecure ? "ssl" : "none";
}

export function smtpSecurityToLegacy(security: ConnectionSecurity): boolean {
  return security === "ssl";
}

export function imapSecurityToLegacy(security: ConnectionSecurity): boolean {
  return security === "ssl";
}
