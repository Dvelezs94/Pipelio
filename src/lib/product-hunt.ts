import type { TechLead } from "./tech-leads";
import { readHttpError, sourceError, type SourceFetchResult } from "./source-fetch";

const PH_API = "https://api.producthunt.com/v2/api/graphql";

type PhPost = {
  id: string;
  name: string;
  tagline?: string | null;
  votesCount?: number;
  website?: string | null;
  topics?: { edges?: Array<{ node?: { name?: string } }> };
};

function getToken(): string | undefined {
  return process.env.PRODUCT_HUNT_TOKEN?.trim();
}

async function phQuery(query: string): Promise<{ posts: PhPost[]; error?: string }> {
  const token = getToken();
  if (!token) {
    return { posts: [], error: "PRODUCT_HUNT_TOKEN is not set in .env" };
  }

  try {
    const res = await fetch(PH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const error = await readHttpError(res, "Product Hunt");
      console.error("[product_hunt]", error);
      return { posts: [], error };
    }

    const data = (await res.json()) as {
      data?: { posts?: { edges?: Array<{ node?: PhPost }> } };
      errors?: Array<{ message?: string }>;
    };

    if (data.errors?.length) {
      const error = `Product Hunt GraphQL: ${data.errors.map((e) => e.message ?? "unknown").join("; ")}`;
      console.error("[product_hunt]", error);
      return { posts: [], error };
    }

    const posts = (data.data?.posts?.edges ?? [])
      .map((e) => e.node)
      .filter((n): n is PhPost => !!n?.id && !!n?.name);

    return { posts };
  } catch (e) {
    const error = e instanceof Error ? e.message : "request failed";
    console.error("[product_hunt]", error, e);
    return { posts: [], error: `Product Hunt: ${error}` };
  }
}

export async function fetchProductHuntByTopics(
  topics: string[],
  industry: string,
  limit: number
): Promise<SourceFetchResult> {
  const leads: TechLead[] = [];
  const seen = new Set<string>();
  let lastError: string | undefined;

  for (const topic of topics) {
    if (leads.length >= limit) break;

    const perTopic = Math.min(30, limit - leads.length);
    const query = `{
      posts(topic: "${topic}", order: VOTES, first: ${perTopic}) {
        edges {
          node {
            id
            name
            tagline
            votesCount
            website
            topics { edges { node { name } } }
          }
        }
      }
    }`;

    const { posts, error } = await phQuery(query);
    if (error) lastError = error;

    for (const post of posts) {
      const externalId = `producthunt:${post.id}`;
      if (seen.has(externalId)) continue;
      seen.add(externalId);

      const topicNames = (post.topics?.edges ?? [])
        .map((e) => e.node?.name)
        .filter((n): n is string => !!n);

      leads.push({
        externalId,
        name: post.name,
        website: post.website ?? null,
        address: null,
        email: null,
        phone: null,
        category: topicNames.length ? topicNames.join(", ") : `Product Hunt · ${topic}`,
        industry,
        reviews: post.votesCount ?? 0,
        rating: null,
        source: "product_hunt",
      });
    }
  }

  return {
    leads,
    error: leads.length === 0 && lastError ? sourceError("product_hunt", lastError) : undefined,
  };
}
