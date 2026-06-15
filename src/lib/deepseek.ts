/**
 * DeepSeek API client for generating cold email content.
 * Uses chat completions: https://api.deepseek.com/chat/completions
 */

const DEEPSEEK_BASE = "https://api.deepseek.com";
const MODEL = "deepseek-chat";

function getApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY?.trim();
}

export type GenerateEmailResult =
  | { ok: true; subject: string | null; body: string }
  | { ok: false; error: string };

/** Language names for the prompt (language code → full name) */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
};

export type ConversationMessageInput = {
  role: "you" | "them";
  subject?: string | null;
  body: string;
};

/** Sender details passed to the model for proposals/emails */
export type ProposalSenderDetails = {
  yourName?: string | null;
  yourTitle?: string | null;
  yourEmail?: string | null;
  yourPhone?: string | null;
  yourWebsite?: string | null;
};

/**
 * Generate cold message (email, WhatsApp, or LinkedIn) using DeepSeek.
 */
export async function generateColdEmail(params: {
  businessName: string;
  industry: string | null;
  emailType: string;
  website?: string | null;
  language?: string;
  sender?: ProposalSenderDetails | null;
  channel?: "email" | "whatsapp" | "linkedin";
  customContext?: string | null;
  quickPrompt?: string | null;
  conversationHistory?: ConversationMessageInput[];
}): Promise<GenerateEmailResult> {
  const key = getApiKey();
  if (!key) {
    return { ok: false, error: "DEEPSEEK_API_KEY is not set. Add it to .env to generate emails." };
  }

  const channel = params.channel ?? "email";
  const typeLabel = CRM_EMAIL_TYPE_LABELS[params.emailType] ?? params.emailType;
  const languageName = params.language ? (LANGUAGE_NAMES[params.language] ?? params.language) : "English";
  const prompt = buildPrompt({
    businessName: params.businessName,
    industry: params.industry ?? "their industry",
    emailType: typeLabel,
    website: params.website,
    language: languageName,
    sender: params.sender ?? null,
    channel,
    customContext: params.customContext,
    quickPrompt: params.quickPrompt,
    conversationHistory: params.conversationHistory,
  });

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return {
        ok: false,
        error: `DeepSeek API error (${res.status}): ${err.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Empty response from DeepSeek." };
    }

    const parsed = parseSubjectAndBody(content, channel);
    return {
      ok: true,
      subject: parsed.subject,
      body: parsed.body,
    };
  } catch (e) {
    console.error("generateColdEmail", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to call DeepSeek.",
    };
  }
}

const CRM_EMAIL_TYPE_LABELS: Record<string, string> = {
  first_contact: "First contact",
  second_follow_up: "Second follow-up",
  third_follow_up: "Third follow-up",
  final_follow_up: "Final follow-up",
  value_reminder: "Value reminder",
};

function buildPrompt(opts: {
  businessName: string;
  industry: string;
  emailType: string;
  website?: string | null;
  language: string;
  sender: ProposalSenderDetails | null;
  channel: "email" | "whatsapp" | "linkedin";
  customContext?: string | null;
  quickPrompt?: string | null;
  conversationHistory?: ConversationMessageInput[];
}): string {
  const sender = opts.sender;
  const hasSender =
    sender &&
    (sender.yourName || sender.yourTitle || sender.yourEmail || sender.yourPhone || sender.yourWebsite);
  const senderBlock = hasSender
    ? `
Sender details (use in the signature / sign-off — e.g. "Best regards, [Name], [Title]", and include phone or website if provided):
- Name: ${sender!.yourName ?? "[not provided]"}
- Title/Role: ${sender!.yourTitle ?? "[not provided]"}
- Email: ${sender!.yourEmail ?? "[not provided]"}
- Phone: ${sender!.yourPhone ?? "[not provided]"}
- Website: ${sender!.yourWebsite ?? "[not provided]"}
Only include in the message the fields that were provided; omit "[not provided]".`
    : "";

  const channelInstructions: Record<"email" | "whatsapp" | "linkedin", string> = {
    email: `You are a professional B2B cold email writer. Write a single cold email for the following scenario.

Requirements:
- Keep the email concise (under 150 words for the body).
- Use a clear, professional but friendly tone.
- Include a short, compelling subject line (no quotes).
- No placeholders like [Company] or [Name] — write as if we're addressing ${opts.businessName} directly.
- Do not use bullet points in the body; use short paragraphs.
${hasSender ? "- Sign the email using the sender details above (name, title; add phone and/or website if provided)." : ""}

Format your response exactly as follows:

SUBJECT:
[your subject line here]

BODY:
[your email body here]`,

    whatsapp: `You are a professional B2B outreach writer. Write a single WhatsApp message for the following scenario. WhatsApp messages should be short, direct, and conversational.

Requirements:
- Keep it very short (under 300 characters ideal; max 2-3 short sentences).
- Casual but professional tone; no subject line.
- Write as if we're addressing ${opts.businessName} directly. No placeholders.
${hasSender ? "- You can sign with first name only if appropriate." : ""}

Format your response exactly as follows (only the message body):

BODY:
[your WhatsApp message here]`,

    linkedin: `You are a professional B2B outreach writer. Write a short LinkedIn connection request or InMail message for the following scenario.

Requirements:
- Keep it concise (under 150 words). Professional and friendly.
- No subject line; the message stands alone.
- Write as if we're addressing ${opts.businessName} directly. No placeholders.
${hasSender ? "- Sign with name/title if appropriate." : ""}

Format your response exactly as follows:

BODY:
[your LinkedIn message here]`,
  };

  const firstContactNote =
    opts.emailType.toLowerCase().includes("first") || opts.emailType === "First contact"
      ? `
**First contact — tone:** Do not be pushy or salesy. The goal is to start a conversation and find out their needs. Be curious and consultative: invite a reply and show interest in understanding their situation, rather than pitching or asking for a meeting. Soft, low-pressure tone.`
      : "";

  const customBlock = opts.customContext?.trim()
    ? `
**Additional instructions (follow closely):**
${opts.customContext.trim()}`
    : "";

  const history = (opts.conversationHistory ?? []).filter((m) => m.body.trim());
  const historyBlock =
    history.length > 0
      ? `
**Recent conversation (last ${history.length} message${history.length === 1 ? "" : "s"} — write the next reply in this thread):**
${history
  .map((m, i) => {
    const who = m.role === "you" ? "You" : opts.businessName;
    const subjectLine = m.subject?.trim() ? `Subject: ${m.subject.trim()}\n` : "";
    return `${i + 1}. ${who}:\n${subjectLine}${m.body.trim()}`;
  })
  .join("\n\n")}

- Continue the thread naturally; do not repeat points already made.
- If they replied, acknowledge and respond to what they said.`
      : "";

  const quickBlock = opts.quickPrompt?.trim()
    ? `
**For this draft specifically (follow closely):**
${opts.quickPrompt.trim()}`
    : "";

  const base = `Company: ${opts.businessName}
Industry: ${opts.industry}
${opts.website ? `Website (recipient): ${opts.website}` : ""}

Message type: ${opts.emailType}
${senderBlock}
${firstContactNote}
${historyBlock}
${customBlock}
${quickBlock}

**Important: Write the entire message in ${opts.language}.**
`;

  return base + "\n" + channelInstructions[opts.channel];
}

function parseSubjectAndBody(content: string, channel: "email" | "whatsapp" | "linkedin" = "email"): { subject: string | null; body: string } {
  const bodyIdx = content.search(/\nBODY:\s*\n/i);
  if (bodyIdx >= 0) {
    const subjectBlock = content.slice(0, bodyIdx);
    const bodyBlock = content.slice(bodyIdx).replace(/^[\s\S]*?BODY:\s*\n/i, "");
    const body = bodyBlock.trim() || content.trim();
    if (channel === "email") {
      const subject = subjectBlock.replace(/^[\s\S]*?SUBJECT:\s*\n?/i, "").trim().replace(/\n/g, " ") || "Follow up";
      return { subject, body };
    }
    return { subject: null, body };
  }
  return { subject: channel === "email" ? "Follow up" : null, body: content.trim() };
}

export type ReviseEmailResult =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

/**
 * Revise an existing email with a user prompt (e.g. "make it shorter", "more formal").
 * Returns revised subject and body in the same format.
 */
export async function reviseEmailWithPrompt(params: {
  subject: string | null;
  body: string;
  userPrompt: string;
}): Promise<ReviseEmailResult> {
  const key = getApiKey();
  if (!key) {
    return { ok: false, error: "DEEPSEEK_API_KEY is not set. Add it to .env to revise emails." };
  }

  const current = [
    params.subject ? `Subject: ${params.subject}` : null,
    "Body:",
    params.body,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are editing an existing cold email. Apply the following requested change and output the revised email.

Current email:
${current}

Requested change: ${params.userPrompt}

Rules:
- Keep the same tone and intent; only change what the user asked for.
- Output the full revised subject and body. Keep the email concise.
- Do not add bullet points; use short paragraphs.

Format your response exactly as follows:

SUBJECT:
[revised subject line]

BODY:
[revised email body]`;

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return {
        ok: false,
        error: `DeepSeek API error (${res.status}): ${err.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Empty response from DeepSeek." };
    }

    const parsed = parseSubjectAndBody(content);
    return { ok: true, subject: parsed.subject ?? "Follow up", body: parsed.body };
  } catch (e) {
    console.error("reviseEmailWithPrompt", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to call DeepSeek.",
    };
  }
}

export type ImproveTextResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Improve or rewrite a text field with optional user instructions.
 * When userPrompt is empty, performs a general clarity/grammar/professionalism pass.
 */
export async function improveText(params: {
  text: string;
  context?: string;
  userPrompt?: string;
}): Promise<ImproveTextResult> {
  const key = getApiKey();
  if (!key) {
    return { ok: false, error: "DEEPSEEK_API_KEY is not set. Add it to .env to use AI." };
  }

  const trimmed = params.text.trim();
  if (!trimmed) {
    return { ok: false, error: "Nothing to improve — enter some text first." };
  }

  const instruction = params.userPrompt?.trim()
    ? `Apply this change: ${params.userPrompt.trim()}`
    : "Improve the text for clarity, grammar, and professionalism while keeping the same meaning and tone.";

  const contextLine = params.context ? `Context: ${params.context}\n\n` : "";

  const prompt = `${contextLine}You are editing text for a CRM outreach tool.

${instruction}

Rules:
- Return ONLY the improved text — no quotes, labels, or explanations.
- Preserve placeholders like {{businessName}} if present.
- Keep similar length unless the user asked to shorten or expand.

Original text:
${trimmed}`;

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `DeepSeek API error (${res.status}): ${err.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Empty response from DeepSeek." };
    }

    return { ok: true, text: content.replace(/^["']|["']$/g, "") };
  } catch (e) {
    console.error("improveText", e);
    return { ok: false, error: e instanceof Error ? e.message : "Failed to call DeepSeek." };
  }
}

