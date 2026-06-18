export type EmailSuggestion = {
  email: string;
  label: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function collectLeadEmailSuggestions(input: {
  contactEmail?: string | null;
  businessEmail?: string | null;
  sentRecipients?: Array<string | null | undefined>;
  inboxFromEmails?: Array<{ email: string; name?: string | null }>;
}): EmailSuggestion[] {
  const seen = new Set<string>();
  const result: EmailSuggestion[] = [];

  function add(email: string | null | undefined, label: string) {
    const trimmed = email?.trim();
    if (!trimmed || !isValidEmail(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ email: trimmed, label });
  }

  add(input.contactEmail, "Contact");
  add(input.businessEmail, "On record");

  for (const recipient of input.sentRecipients ?? []) {
    add(recipient, "Previously sent");
  }

  for (const { email, name } of input.inboxFromEmails ?? []) {
    add(email, name?.trim() ? `From ${name.trim()}` : "Inbox");
  }

  return result;
}
