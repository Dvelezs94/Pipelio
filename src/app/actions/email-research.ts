"use server";

import {
  buildResearchLinks,
  executiveEmailGuesses,
  extractDomain,
  fetchPageEmails,
  resolveFetchUrl,
} from "@/lib/email-research";

export type EmailResearchResult = {
  domain: string | null;
  guesses: { email: string; label: string }[];
  foundOnSite: string[];
  researchLinks: { label: string; href: string }[];
  pagesChecked: string[];
};

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
