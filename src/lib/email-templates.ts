import type { ProposalSenderRow } from "@/app/actions/proposal-sender";

export type TemplateVars = {
  businessName: string;
  industry: string;
  website: string;
  yourName: string;
  yourTitle: string;
  yourEmail: string;
  yourPhone: string;
  yourWebsite: string;
};

export type SenderFallback = {
  fromName?: string | null;
  fromEmail?: string | null;
};

/** Format website for inline template use, e.g. " at https://example.com" */
export function formatWebsiteForTemplate(website: string | null | undefined): string {
  if (!website?.trim()) return "";
  const raw = website.trim();
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  try {
    return ` at ${url.replace(/\/$/, "")}`;
  } catch {
    return ` at ${raw}`;
  }
}

export function buildTemplateVars(
  business: { name: string; industry: string | null; website: string | null },
  sender: ProposalSenderRow | null,
  fallback?: SenderFallback | null
): TemplateVars {
  return {
    businessName: business.name,
    industry: business.industry ?? "your industry",
    website: formatWebsiteForTemplate(business.website),
    yourName: sender?.yourName?.trim() || fallback?.fromName?.trim() || "",
    yourTitle: sender?.yourTitle?.trim() || "",
    yourEmail: sender?.yourEmail?.trim() || fallback?.fromEmail?.trim() || "",
    yourPhone: sender?.yourPhone?.trim() || "",
    yourWebsite: sender?.yourWebsite?.trim() || "",
  };
}

export function renderTemplate(template: string, vars: Partial<TemplateVars>): string {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key as keyof TemplateVars];
    return value?.trim() ?? "";
  });
  return rendered.replace(/\n{3,}/g, "\n\n").trim();
}

export function unreplacedPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
}

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: "First contact – Uptinio intro",
    type: "first_contact",
    channel: "email",
    language: "en",
    subjectTemplate: "Keeping {{businessName}} online when it matters",
    bodyTemplate: `Hi {{businessName}} team,

I noticed {{businessName}} in the {{industry}} space{{website}} and wanted to reach out briefly.

We help internet companies monitor uptime, server health, and incidents in one place with Uptinio — so your team knows about problems before your users do.

Would it be useful to see how teams like yours set up monitoring in a quick call?

Best regards,
{{yourName}}
{{yourTitle}}
{{yourEmail}}
{{yourWebsite}}`,
    isDefault: true,
  },
  {
    name: "Second follow-up",
    type: "second_follow_up",
    channel: "email",
    language: "en",
    subjectTemplate: "Re: monitoring for {{businessName}}",
    bodyTemplate: `Hi again,

I wanted to follow up on my note about uptime monitoring for {{businessName}}.

If reliability or incident response is on your roadmap, I'd be happy to share a short demo tailored to {{industry}} teams.

Best,
{{yourName}}`,
    isDefault: true,
  },
  {
    name: "Third follow-up",
    type: "third_follow_up",
    channel: "email",
    language: "en",
    subjectTemplate: "Quick check-in – {{businessName}}",
    bodyTemplate: `Hi,

Just checking whether monitoring or status pages are something {{businessName}} is exploring this quarter.

Happy to send a one-pager or jump on a 15-minute call if helpful.

Thanks,
{{yourName}}`,
    isDefault: true,
  },
  {
    name: "Value reminder",
    type: "value_reminder",
    channel: "email",
    language: "en",
    subjectTemplate: "How teams catch outages early",
    bodyTemplate: `Hi {{businessName}} team,

Teams using proactive monitoring typically reduce time-to-detect incidents significantly — especially for APIs, cron jobs, and multi-service setups.

If you'd like examples relevant to {{industry}}, I can send a few.

Best,
{{yourName}}
{{yourTitle}}`,
    isDefault: true,
  },
] as const;
