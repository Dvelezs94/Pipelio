import type { TechLead } from "./tech-leads";
import { readHttpError, sourceError, type SourceFetchResult } from "./source-fetch";

const GITHUB_API = "https://api.github.com";

type GitHubSearchItem = {
  login: string;
  id: number;
};

type GitHubOrg = {
  login: string;
  name?: string | null;
  blog?: string | null;
  location?: string | null;
  email?: string | null;
  description?: string | null;
  public_repos?: number;
  followers?: number;
};

function getToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim();
}

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function searchOrgs(
  keyword: string,
  perPage: number
): Promise<{ items: GitHubSearchItem[]; error?: string }> {
  try {
    const q = encodeURIComponent(`type:org ${keyword} repos:>2`);
    const res = await fetch(
      `${GITHUB_API}/search/users?q=${q}&sort=repositories&order=desc&per_page=${perPage}`,
      {
        headers: authHeaders(),
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      const error = await readHttpError(res, "GitHub");
      console.error("[github]", error);
      if (res.status === 403 && !getToken()) {
        return {
          items: [],
          error: `${error}. Add GITHUB_TOKEN to .env for higher rate limits.`,
        };
      }
      return { items: [], error };
    }

    const data = (await res.json()) as { items?: GitHubSearchItem[] };
    return { items: data.items ?? [] };
  } catch (e) {
    const error = e instanceof Error ? e.message : "request failed";
    console.error("[github]", error, e);
    return { items: [], error: `GitHub: ${error}` };
  }
}

async function getOrg(login: string): Promise<GitHubOrg | null> {
  const res = await fetch(`${GITHUB_API}/orgs/${encodeURIComponent(login)}`, {
    headers: authHeaders(),
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;
  return (await res.json()) as GitHubOrg;
}

export async function fetchGitHubOrgsByKeywords(
  keywords: string[],
  industry: string,
  limit: number
): Promise<SourceFetchResult> {
  const leads: TechLead[] = [];
  const seen = new Set<string>();
  let lastError: string | undefined;

  for (const keyword of keywords) {
    if (leads.length >= limit) break;

    const perKeyword = Math.min(20, limit - leads.length);
    const { items, error } = await searchOrgs(keyword, perKeyword);
    if (error) lastError = error;

    for (const item of items) {
      if (leads.length >= limit) break;
      const externalId = `github:${item.login}`;
      if (seen.has(externalId)) continue;

      const org = await getOrg(item.login);
      if (!org) continue;

      seen.add(externalId);

      const website = org.blog?.trim() || `https://github.com/${org.login}`;
      leads.push({
        externalId,
        name: org.name?.trim() || org.login,
        website,
        address: org.location ?? null,
        email: org.email ?? null,
        phone: null,
        category: org.description ?? "GitHub Organization",
        industry,
        reviews: org.public_repos ?? 0,
        rating: null,
        source: "github",
      });

      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return {
    leads,
    error: leads.length === 0 && lastError ? sourceError("github", lastError) : undefined,
  };
}
