"use server";

import { lookupExecutiveEmailWithAi } from "@/lib/deepseek";
import {
  buildResearchLinks,
  executiveEmailGuesses,
  extractDomain,
  fetchPageEmails,
  isPlausibleBusinessEmail,
  resolveFetchUrl,
} from "@/lib/email-research";

export type EmailResearchResult = {
  domain: string | null;
  guesses: { email: string; label: string }[];
  foundOnSite: string[];
  researchLinks: { label: string; href: string }[];
  pagesChecked: string[];
};

export type AiExecutiveEmailResult =
  | {
      success: true;
      email: string;
      personName: string | null;
      confidence: string | null;
      note: string | null;
    }
  | { success: false; error: string; note: string | null; rawResponse: string | null };

export async function lookupExecutiveEmailAi(
  companyName: string,
  website: string | null | undefined,
  role: "ceo" | "cto"
): Promise<AiExecutiveEmailResult> {
  const domain = extractDomain(website ?? null);
  const result = await lookupExecutiveEmailWithAi({
    companyName,
    website,
    domain,
    role,
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.error,
      note: result.note ?? null,
      rawResponse: result.rawResponse,
    };
  }

  if (!result.email) {
    return {
      success: false,
      error: `AI could not find a ${role.toUpperCase()} email for this company.`,
      note: result.note,
      rawResponse: result.rawResponse,
    };
  }

  if (!isPlausibleBusinessEmail(result.email, domain)) {
    return {
      success: false,
      error: "AI returned an implausible email. Verify manually before sending.",
      note: result.note,
      rawResponse: result.rawResponse,
    };
  }

  return {
    success: true,
    email: result.email,
    personName: result.personName,
    confidence: result.confidence,
    note: result.note,
  };
}

export async function researchLeadEmail(
  companyName: string,
  website: string | null | undefined
): Promise<EmailResearchResult> {
  const domain = extractDomain(website ?? null);
  const guesses = domain ? executiveEmailGuesses(domain) : [];
  const researchLinks = buildResearchLinks(companyName, domain);

  const found = new Set<string>();
  const pagesChecked: string[] = [];

  if (website?.trim()) {
    const paths = ["/", "/contact", "/about", "/team", "/company"];
    for (const path of paths) {
      const url = resolveFetchUrl(website, path);
      if (!url) continue;
      pagesChecked.push(url.pathname || "/");
      const emails = await fetchPageEmails(url, domain);
      for (const e of emails) found.add(e);
      if (found.size >= 12) break;
    }
  }

  const foundOnSite = [...found].sort();
  const executiveMatches = foundOnSite.filter((e) =>
    /^(ceo|cto|founder|founders|contact|hello|info|team)@/i.test(e)
  );

  return {
    domain,
    guesses,
    foundOnSite: executiveMatches.length > 0 ? executiveMatches : foundOnSite,
    researchLinks,
    pagesChecked,
  };
}
