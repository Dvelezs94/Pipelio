"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRM_EMAIL_TYPES, EMAIL_LANGUAGES, MESSAGE_CHANNELS } from "@/lib/email-types";
import {
  generateCrmEmail,
  previewEmailTemplate,
  upsertComposeEmail,
  sendCrmEmail,
  getCrmEmailsForLead,
  getCrmInboxForLead,
  type CrmEmailRow,
  type CrmInboxRow,
} from "@/app/actions/crm-email";
import { getSmtpConfigStatus } from "@/app/actions/smtp-config";
import type { EmailTemplateRow } from "@/app/actions/email-templates";
import type { CrmLeadRow } from "./CrmLeadsTable";
import { AiTextField } from "@/components/AiTextField";
import { EmailSuggestionChips } from "@/components/EmailSuggestionChips";
import { collectLeadEmailSuggestions } from "@/lib/lead-email-suggestions";
import { cn } from "@/lib/utils";
import { Loader2, Send, Sparkles, AlertTriangle } from "lucide-react";

type ThreadItem =
  | { kind: "sent"; date: Date; email: CrmEmailRow }
  | { kind: "received"; date: Date; message: CrmInboxRow };

export function CrmLeadConversationPanel({
  lead,
  templates,
  contactEmail,
}: {
  lead: CrmLeadRow;
  templates: EmailTemplateRow[];
  contactEmail: string;
}) {
  const router = useRouter();
  const [emails, setEmails] = useState<CrmEmailRow[]>([]);
  const [inbox, setInbox] = useState<CrmInboxRow[]>([]);
  const [selectedType, setSelectedType] = useState<string>(CRM_EMAIL_TYPES[0].value);
  const [selectedChannel, setSelectedChannel] = useState<string>(MESSAGE_CHANNELS[0].value);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(EMAIL_LANGUAGES[0].value);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeDraftId, setComposeDraftId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState(contactEmail);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [aiQuickPrompt, setAiQuickPrompt] = useState("");
  const [smtpStatus, setSmtpStatus] = useState<{ configured: boolean; issues: string[] } | null>(
    null
  );
  const composeInitializedRef = useRef(false);
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((instant = true) => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: instant ? "auto" : "smooth" });
  }, []);

  const loadEmails = useCallback(async () => {
    const [list, inboxList] = await Promise.all([
      getCrmEmailsForLead(lead.id),
      getCrmInboxForLead(lead.id),
    ]);
    setEmails(list);
    setInbox(inboxList);

    if (!composeInitializedRef.current) {
      composeInitializedRef.current = true;
      const draft = list.find((e) => e.sendStatus !== "sent");
      if (draft) {
        setComposeSubject(draft.subject ?? "");
        setComposeBody(draft.body);
        setComposeDraftId(draft.id);
        setSelectedType(draft.type);
        setSelectedLanguage(draft.language);
        setSelectedChannel(draft.channel);
      }
    }
  }, [lead.id]);

  useEffect(() => {
    void getSmtpConfigStatus().then(setSmtpStatus);
  }, [lead.id]);

  useEffect(() => {
    composeInitializedRef.current = false;
    setComposeSubject("");
    setComposeBody("");
    setComposeDraftId(null);
    setSelectedTemplateId("");
    setAiQuickPrompt("");
    setSendFeedback(null);
  }, [lead.id]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadEmails();
    }, 90_000);
    return () => clearInterval(id);
  }, [loadEmails]);

  useEffect(() => {
    setRecipient(contactEmail);
  }, [contactEmail]);

  const emailSuggestions = useMemo(
    () =>
      collectLeadEmailSuggestions({
        contactEmail: lead.contactEmail,
        businessEmail: lead.business.email,
        sentRecipients: emails.map((e) => e.recipient),
        inboxFromEmails: inbox.map((m) => ({ email: m.fromEmail, name: m.fromName })),
      }),
    [lead.contactEmail, lead.business.email, emails, inbox]
  );

  const thread = useMemo<ThreadItem[]>(() => {
    const items: ThreadItem[] = [
      ...emails
        .filter((e) => e.sendStatus === "sent" || e.sendStatus === "failed")
        .map((email) => ({
          kind: "sent" as const,
          date: new Date(email.sentAt ?? email.createdAt),
          email,
        })),
      ...inbox.map((message) => ({
        kind: "received" as const,
        date: new Date(message.receivedAt),
        message,
      })),
    ];
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [emails, inbox]);

  useEffect(() => {
    if (thread.length === 0) return;
    requestAnimationFrame(() => scrollToBottom(true));
  }, [thread, lead.id, scrollToBottom]);

  const templateTypeLabel = (type: string) =>
    CRM_EMAIL_TYPES.find((t) => t.value === type)?.label ?? type;

  async function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    setLoadingTemplate(true);
    try {
      const res = await previewEmailTemplate(lead.id, templateId);
      if (res.success) {
        setComposeSubject(res.data.subject ?? "");
        setComposeBody(res.data.body);
        setSelectedType(res.data.type);
        setSelectedLanguage(res.data.language);
        setSelectedChannel(res.data.channel);
      } else {
        alert(res.error);
      }
    } finally {
      setLoadingTemplate(false);
    }
  }

  function buildRecentConversationContext() {
    return thread.slice(-3).map((item) =>
      item.kind === "received"
        ? {
            role: "them" as const,
            subject: item.message.subject,
            body: item.message.bodyText ?? "",
          }
        : {
            role: "you" as const,
            subject: item.email.subject,
            body: item.email.body,
          }
    );
  }

  async function handleAiGenerate() {
    setGenerating(true);
    try {
      const res = await generateCrmEmail(
        lead.id,
        selectedType,
        selectedLanguage,
        selectedChannel as "email" | "whatsapp" | "linkedin",
        {
          previewOnly: true,
          conversationHistory: buildRecentConversationContext(),
          quickPrompt: aiQuickPrompt.trim() || null,
        }
      );
      if (res.success && res.data) {
        const data = res.data as { subject?: string; body?: string };
        if (data.subject) setComposeSubject(data.subject);
        if (data.body) setComposeBody(data.body);
      } else if (!res.success) {
        alert(res.error);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleComposeSend() {
    const to = recipient.trim();
    const body = composeBody.trim();
    if (!body) return;
    if (!to) {
      setSendFeedback({
        type: "error",
        message: "Enter a recipient email, or set one on the Overview tab.",
      });
      return;
    }

    const status = smtpStatus ?? (await getSmtpConfigStatus());
    setSmtpStatus(status);
    if (!status.configured) {
      const missing = status.issues.length > 0 ? ` Missing: ${status.issues.join(", ")}.` : "";
      alert(
        `SMTP is not configured for this business.${missing}\n\n` +
          "Open CRM → Settings → Mail server to save your SMTP details before sending."
      );
      return;
    }

    setSending(true);
    setSendFeedback(null);
    try {
      const saveRes = await upsertComposeEmail(lead.id, {
        draftId: composeDraftId,
        subject: composeSubject.trim() || null,
        body,
        type: selectedType,
        language: selectedLanguage,
        channel: selectedChannel,
      });
      if (!saveRes.success) {
        setSendFeedback({ type: "error", message: saveRes.error ?? "Failed to save message." });
        return;
      }
      if (!saveRes.data?.id) {
        setSendFeedback({ type: "error", message: "Failed to save message." });
        return;
      }

      const emailId = saveRes.data.id;
      setComposeDraftId(emailId);

      const sendRes = await sendCrmEmail(emailId, to);
      await loadEmails();

      if (sendRes.success) {
        setComposeSubject("");
        setComposeBody("");
        setComposeDraftId(null);
        setSelectedTemplateId("");
        composeInitializedRef.current = true;
        setSendFeedback({ type: "success", message: "Sent." });
        router.refresh();
        requestAnimationFrame(() => scrollToBottom(false));
      } else {
        setSendFeedback({
          type: "error",
          message: sendRes.error ?? "Failed to send. Check Settings → Mail server.",
        });
      }
    } catch {
      setSendFeedback({
        type: "error",
        message: "Failed to send. Check your SMTP configuration.",
      });
    } finally {
      setSending(false);
    }
  }

  const canSend = composeBody.trim().length > 0 && !sending;

  return (
    <div className="flex flex-col min-h-[420px] -mx-1">
      <div
        ref={threadScrollRef}
        className="flex-1 overflow-y-auto rounded-lg bg-muted/15 px-2 py-3 space-y-2 min-h-[200px] max-h-[340px]"
      >
        {thread.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No messages yet. Write below or pick a template to start.
          </p>
        ) : (
          thread.map((item) =>
            item.kind === "received" ? (
              <div key={`in-${item.message.id}`} className="flex justify-start">
                <div className="rounded-2xl rounded-tl-md bg-card border shadow-sm px-3 py-2 max-w-[85%] min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    {item.message.fromName ?? item.message.fromEmail}
                  </p>
                  {item.message.subject && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">{item.message.subject}</p>
                  )}
                  {item.message.bodyText && (
                    <p className="text-sm whitespace-pre-wrap break-words">{item.message.bodyText}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground text-right mt-1">
                    {item.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ) : (
              <div key={`out-${item.email.id}`} className="flex justify-end">
                <div
                  className={cn(
                    "rounded-2xl rounded-tr-md px-3 py-2 max-w-[85%] min-w-0 shadow-sm",
                    item.email.sendStatus === "failed"
                      ? "bg-destructive/15 border border-destructive/30"
                      : "bg-primary/15 border border-primary/20"
                  )}
                >
                  {item.email.sendStatus === "failed" && (
                    <p className="text-[10px] text-destructive font-medium mb-0.5">Failed to send</p>
                  )}
                  {item.email.subject && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">{item.email.subject}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{item.email.body}</p>
                  <p className="text-[10px] text-muted-foreground text-right mt-1">
                    {item.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {item.email.sendStatus === "sent" && " ✓"}
                  </p>
                </div>
              </div>
            )
          )
        )}
      </div>

      <div className="shrink-0 mt-3 rounded-2xl border bg-card shadow-sm p-3 space-y-2">
        {smtpStatus && !smtpStatus.configured && (
          <div
            className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
            role="status"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p>
              SMTP is not set up for this business
              {smtpStatus.issues.length > 0 ? ` (missing: ${smtpStatus.issues.join(", ")})` : ""}.
              Open <span className="font-medium">CRM → Settings → Mail server</span> to configure it
              before sending.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px] space-y-1">
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="To: email@company.com"
              type="email"
              list="crm-recipient-suggestions"
              className="h-8 text-xs w-full border-0 bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-1"
            />
            <datalist id="crm-recipient-suggestions">
              {emailSuggestions.map((s) => (
                <option key={s.email} value={s.email} label={s.label} />
              ))}
            </datalist>
            <EmailSuggestionChips
              suggestions={emailSuggestions}
              value={recipient}
              onSelect={setRecipient}
              compact
            />
          </div>
          <Select value={selectedTemplateId || "_none"} onValueChange={(v) => handleTemplateChange(v === "_none" ? "" : v)}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] max-w-[260px] text-xs border-0 bg-muted">
              <SelectValue placeholder="Template…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No template</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {templateTypeLabel(t.type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={aiQuickPrompt}
            onChange={(e) => setAiQuickPrompt(e.target.value)}
            placeholder="AI prompt: e.g. short follow-up, answer their question…"
            className="h-8 text-xs flex-1 min-w-[160px] border-0 bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleAiGenerate();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 shrink-0"
            onClick={() => void handleAiGenerate()}
            disabled={generating}
            title="Generate with AI — uses your prompt, conversation, and Settings context"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI draft
          </Button>
        </div>

        <Input
          value={composeSubject}
          onChange={(e) => setComposeSubject(e.target.value)}
          placeholder="Subject"
          className="h-8 text-sm border-0 bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-1"
        />

        <div className="flex gap-2 items-start">
          <AiTextField
            value={composeBody}
            onChange={setComposeBody}
            context="cold outreach email body"
            placeholder="Type a message…"
            multiline
            rows={5}
            className="flex-1 min-w-0"
            inputClassName="rounded-2xl border-0 bg-muted min-h-[120px] max-h-72 py-2.5 pl-3.5 pr-10 resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            type="button"
            size="icon"
            className={cn(
              "h-11 w-11 shrink-0 rounded-full shadow-md mt-1",
              canSend ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground"
            )}
            onClick={() => void handleComposeSend()}
            disabled={!canSend}
            title="Send"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        {(loadingTemplate || sendFeedback) && (
          <p
            className={cn(
              "text-xs px-1",
              sendFeedback?.type === "error"
                ? "text-destructive"
                : sendFeedback?.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
            )}
            role="status"
          >
            {loadingTemplate ? "Loading template…" : sendFeedback?.message}
          </p>
        )}
      </div>
    </div>
  );
}
