import type { TechLead } from "./tech-leads";
import type { SearchSourceId } from "./search-sources";
import { SOURCE_LABELS } from "./search-sources";

export type SourceFetchResult = {
  leads: TechLead[];
  error?: string;
};

export function sourceError(source: SearchSourceId, message: string): string {
  const label = SOURCE_LABELS[source] ?? source;
  return message.startsWith(`${label}:`) ? message : `${label}: ${message}`;
}

export async function readHttpError(res: Response, apiName: string): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as {
      error?: string | { message?: string; type?: string };
      message?: string;
    };
    const nested = typeof json.error === "object" ? json.error : null;
    const msg =
      nested?.message?.trim() ||
      (typeof json.error === "string" ? json.error.trim() : "") ||
      json.message?.trim();
    const type = nested?.type?.trim();
    if (msg) {
      return type ? `${apiName} ${res.status} (${type}): ${msg}` : `${apiName} ${res.status}: ${msg}`;
    }
  } catch {
    // not JSON
  }
  const snippet = text.trim().slice(0, 240);
  return snippet ? `${apiName} HTTP ${res.status}: ${snippet}` : `${apiName} HTTP ${res.status}`;
}
