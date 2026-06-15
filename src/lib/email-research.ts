const JUNK_EMAIL_PATTERNS = [
  /@example\.com$/i,
  /@email\.com$/i,
  /@domain\.com$/i,
  /@sentry\./i,
  /@wixpress\.com$/i,
  /@wordpress\.com$/i,
  /@googleapis\.com$/i,
  /@youtube\.com$/i,
  /@facebook\.com$/i,
  /@twitter\.com$/i,
  /@linkedin\.com$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.gif$/i,
  /\.webp$/i,
  /\.svg$/i,
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
];

export function extractDomain(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

export function executiveEmailGuesses(domain: string): { email: string; label: string }[] {
  const roles = [
    { local: "ceo", label: "CEO" },
    { local: "cto", label: "CTO" },
    { local: "founder", label: "Founder" },
    { local: "founders", label: "Founders" },
    { local: "contact", label: "Contact" },
    { local: "hello", label: "Hello" },
    { local: "info", label: "Info" },
    { local: "team", label: "Team" },
  ];
  return roles.map(({ local, label }) => ({
    email: `${local}@${domain}`,
    label,
  }));
}

export function isPlausibleBusinessEmail(email: string, domain: string | null): boolean {
  const lower = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return false;
  if (JUNK_EMAIL_PATTERNS.some((p) => p.test(lower))) return false;
  if (domain) {
    const emailDomain = lower.split("@")[1];
    if (emailDomain === domain || emailDomain.endsWith(`.${domain}`)) return true;
  }
  return true;
}

export function extractEmailsFromHtml(html: string, domain: string | null): string[] {
  const found = new Set<string>();

  for (const match of html.matchAll(/mailto:([^\s"'<>?]+)/gi)) {
    const raw = decodeURIComponent(match[1].split("?")[0].trim());
    if (isPlausibleBusinessEmail(raw, domain)) found.add(raw.toLowerCase());
  }

  for (const match of html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
    const email = match[0].toLowerCase();
    if (isPlausibleBusinessEmail(email, domain)) found.add(email);
  }

  return [...found].sort();
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function linkedInPeopleSearchUrl(keywords: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

export function buildResearchLinks(companyName: string, domain: string | null) {
  const name = companyName.trim();
  const domainHint = domain ? ` site:${domain}` : "";
  return [
    {
      label: "Google: CEO email",
      href: googleSearchUrl(`"${name}" CEO email${domainHint}`),
    },
    {
      label: "Google: CTO email",
      href: googleSearchUrl(`"${name}" CTO email${domainHint}`),
    },
    {
      label: "LinkedIn: CEO",
      href: linkedInPeopleSearchUrl(`${name} CEO`),
    },
    {
      label: "LinkedIn: CTO",
      href: linkedInPeopleSearchUrl(`${name} CTO`),
    },
    {
      label: "Google: founder email",
      href: googleSearchUrl(`"${name}" founder email${domainHint}`),
    },
  ];
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) {
    return true;
  }
  return false;
}

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function resolveFetchUrl(baseWebsite: string, path: string): URL | null {
  try {
    const base = new URL(baseWebsite.startsWith("http") ? baseWebsite : `https://${baseWebsite}`);
    if (!["http:", "https:"].includes(base.protocol)) return null;
    if (isPrivateHost(base.hostname)) return null;
    const url = new URL(path, base.origin);
    if (normalizeHost(url.hostname) !== normalizeHost(base.hostname)) return null;
    if (isPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function fetchPageEmails(url: URL, domain: string | null): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Pipelio/1.0; +email-research)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();
    if (html.length > 600_000) return [];
    return extractEmailsFromHtml(html, domain);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
