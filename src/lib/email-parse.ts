/** Decode quoted-printable (basic, handles soft line breaks). */
function decodeQuotedPrintable(input: string): string {
  const withoutSoftBreaks = input.replace(/=\r?\n/g, "");
  return withoutSoftBreaks.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function decodeBase64(input: string): string {
  try {
    return Buffer.from(input.replace(/\s/g, ""), "base64").toString("utf8");
  } catch {
    return input;
  }
}

function decodePartBody(body: string, encoding: string | null): string {
  const enc = encoding?.toLowerCase() ?? "";
  if (enc.includes("base64")) return decodeBase64(body);
  if (enc.includes("quoted-printable")) return decodeQuotedPrintable(body);
  return body;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type MimePart = {
  headers: string;
  body: string;
};

function splitMimeParts(raw: string, boundary: string): MimePart[] {
  const parts: MimePart[] = [];
  const chunks = raw.split(`--${boundary}`);
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed || trimmed === "--") continue;
    const sep = trimmed.search(/\r?\n\r?\n/);
    if (sep === -1) continue;
    parts.push({
      headers: trimmed.slice(0, sep),
      body: trimmed.slice(sep).replace(/^\r?\n\r?\n/, "").trim(),
    });
  }
  return parts;
}

function partContentType(headers: string): string | null {
  const match = headers.match(/Content-Type:\s*([^;\r\n]+)/i);
  return match?.[1]?.trim().toLowerCase() ?? null;
}

function partEncoding(headers: string): string | null {
  const match = headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  return match?.[1]?.trim() ?? null;
}

function extractFromPart(part: MimePart): string | null {
  const type = partContentType(part.headers);
  if (!type) return null;
  const encoding = partEncoding(part.headers);

  if (type.includes("multipart/")) {
    const boundaryMatch = part.headers.match(/boundary="?([^";\r\n]+)"?/i);
    if (!boundaryMatch) return null;
    return pickBestBodyFromParts(splitMimeParts(part.body, boundaryMatch[1]));
  }

  const decoded = decodePartBody(part.body, encoding);
  if (type.includes("text/plain")) return decoded.trim();
  if (type.includes("text/html")) return stripHtml(decoded);
  return null;
}

function pickBestBodyFromParts(parts: MimePart[]): string | null {
  let htmlFallback: string | null = null;
  for (const part of parts) {
    const text = extractFromPart(part);
    if (!text) continue;
    const type = partContentType(part.headers);
    if (type?.includes("text/plain")) return text;
    if (type?.includes("text/html") && !htmlFallback) htmlFallback = text;
  }
  return htmlFallback;
}

/** Extract human-readable body from raw RFC822/MIME source. */
export function extractPlainTextFromMime(source: string | Buffer | null | undefined): string {
  if (!source) return "";
  const raw = (typeof source === "string" ? source : source.toString("utf8")).trim();
  if (!raw) return "";

  const headerEnd = raw.search(/\r?\n\r?\n/);
  if (headerEnd === -1) return raw;

  const headers = raw.slice(0, headerEnd);
  const body = raw.slice(headerEnd).replace(/^\r?\n\r?\n/, "");

  const topType = headers.match(/Content-Type:\s*([^;\r\n]+)/i)?.[1]?.trim().toLowerCase();
  const topEncoding = partEncoding(headers);

  if (topType?.includes("multipart/")) {
    const boundary = headers.match(/boundary="?([^";\r\n]+)"?/i)?.[1];
    if (boundary) {
      const parsed = pickBestBodyFromParts(splitMimeParts(body, boundary));
      if (parsed) return parsed;
    }
  }

  if (topType?.includes("text/html")) {
    return stripHtml(decodePartBody(body, topEncoding));
  }

  if (topType?.includes("text/plain") || !topType?.includes("/")) {
    const decoded = decodePartBody(body, topEncoding);
    // Simple single-part message — drop obvious header lines if body still looks like raw MIME
    if (/^Return-Path:/im.test(decoded) || /^Received:/im.test(decoded)) {
      const inner = extractPlainTextFromMime(decoded);
      if (inner) return inner;
    }
    return decoded.trim();
  }

  return decodePartBody(body, topEncoding).trim();
}

/** Reply/forward markers — keep only the new message above these. */
const REPLY_HEADER_PATTERNS: RegExp[] = [
  // Reply On 6/11/26 19:47, Diego Velez wrote:
  /\s+(?:Reply\s+)?On\s+\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}(?:\s+\d{1,2}:\d{2})?,\s*[\s\S]*?\s+wrote\s*:/i,
  // On Mon, Jun 11, 2026 at 7:47 PM Name <email> wrote:
  /\s+On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s\S]*?\s+wrote\s*:/i,
  // On 11 Jun 2026, at 19:47, Name wrote:
  /\s+On\s+\d{1,2}\s+\w+\s+\d{4}[\s\S]*?\s+wrote\s*:/i,
  // El 11/6/26, Diego Velez escribió:
  /\s+El\s+[\s\S]*?\s+escribi[oó]\s*:/i,
  // Le 11/06/2026 à 19:47, Name a écrit :
  /\s+Le\s+[\s\S]*?\s+a\s+[ée]crit\s*:/i,
  // Am 11.06.2026 um 19:47 schrieb Name:
  /\s+Am\s+[\s\S]*?\s+schrieb\s*[\s\S]*?:/i,
  // -----Original Message-----
  /\n-{2,}\s*Original Message\s*-{2,}/i,
  // Outlook-style header block
  /\nFrom:\s*.+\nSent:\s*.+\nTo:\s*.+\nSubject:\s*/i,
  // Underscore separator (some clients)
  /\n_{5,}\s*\n/,
];

/** Remove quoted previous messages from a plain-text email body. */
export function stripQuotedReply(text: string): string {
  let result = text.trim();
  if (!result) return "";

  for (const pattern of REPLY_HEADER_PATTERNS) {
    const match = pattern.exec(result);
    if (match && match.index > 0) {
      result = result.slice(0, match.index).trim();
      break;
    }
  }

  const lines = result.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function looksLikeRawMime(text: string): boolean {
  const head = text.slice(0, 1200);
  return (
    /Return-Path:/i.test(head) ||
    /Content-Type:\s*multipart/i.test(head) ||
    (/Received:/i.test(head) && /MIME-Version:/i.test(head))
  );
}

/** Normalize inbox body: parse MIME if needed and strip quoted replies. */
export function cleanInboxBodyText(body: string | null | undefined): string {
  if (!body?.trim()) return "";
  let text = body.trim();
  if (looksLikeRawMime(text)) {
    text = extractPlainTextFromMime(text) || text;
  }
  return stripQuotedReply(text);
}

/** Format stored inbox body for UI (handles legacy raw MIME rows). */
export function formatInboxBodyForDisplay(body: string | null | undefined): string {
  return cleanInboxBodyText(body);
}

/** Re-parse stored inbox body; returns cleaned text or null if unchanged. */
export function reparseStoredInboxBody(body: string | null | undefined): string | null {
  if (!body?.trim()) return null;
  const cleaned = cleanInboxBodyText(body);
  if (!cleaned || cleaned === body.trim()) return null;
  return cleaned.slice(0, 50000);
}
