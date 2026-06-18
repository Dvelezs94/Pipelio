"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addCrmNote,
  deleteCrmNote,
  updateCrmLead,
} from "@/app/actions/crm";
import { setLeadContactEmail, markLeadInboxRead } from "@/app/actions/crm-email";
import { CrmLeadConversationPanel } from "./CrmLeadConversationPanel";
import { EmailResearchPanel } from "./EmailResearchPanel";
import type { CrmLeadRow } from "./CrmLeadsTable";
import type { EmailTemplateRow } from "@/app/actions/email-templates";
import { AiTextField } from "@/components/AiTextField";
import { EmailSuggestionChips } from "@/components/EmailSuggestionChips";
import { collectLeadEmailSuggestions } from "@/lib/lead-email-suggestions";
import { ListingProfileLink, ListingSearchOrigin } from "@/components/ListingSourceLinks";
import { resolveBusinessSourceUrl, sourceLabelForBusiness } from "@/lib/listing-source";
import { cn } from "@/lib/utils";
import { CRM_LEAD_STATUSES, CRM_LEAD_STATUS_LABEL } from "@/lib/crm-statuses";
import { CrmLeadTagsEditor, CrmLeadTagList } from "./CrmLeadTags";
import {
  Building2,
  ExternalLink,
  Linkedin,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Trash2,
} from "lucide-react";

export type LeadModalTab = "overview" | "conversation" | "notes";

export function CrmLeadModal({
  lead,
  templates,
  open,
  onOpenChange,
  initialTab = "overview",
}: {
  lead: CrmLeadRow | null;
  templates: EmailTemplateRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: LeadModalTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<LeadModalTab>(initialTab);
  const [status, setStatus] = useState("new");
  const [contactEmail, setContactEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const openedLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lead && open) {
      setStatus(lead.status);
      setContactEmail(lead.contactEmail ?? lead.business.email ?? "");
    }
  }, [lead, open]);

  useEffect(() => {
    if (!open) {
      openedLeadIdRef.current = null;
      return;
    }
    if (lead && lead.id !== openedLeadIdRef.current) {
      openedLeadIdRef.current = lead.id;
      setTab(initialTab);
      setNewNote("");
    }
  }, [open, lead, initialTab]);

  const unreadCount = lead?.unreadInboxCount ?? 0;
  const [conversationRead, setConversationRead] = useState(false);
  const markedInboxReadRef = useRef(false);

  useEffect(() => {
    if (!open) {
      markedInboxReadRef.current = false;
      setConversationRead(false);
      return;
    }
    if (tab !== "conversation" || !lead?.id) return;
    setConversationRead(true);
    if (markedInboxReadRef.current) return;
    markedInboxReadRef.current = true;
    void markLeadInboxRead(lead.id);
  }, [open, tab, lead?.id]);

  if (!lead) return null;

  const b = lead.business;
  const noteCount = lead.noteList?.length ?? 0;
  const contactEmailSuggestions = collectLeadEmailSuggestions({
    contactEmail: lead.contactEmail,
    businessEmail: b.email,
  });

  async function handleStatusChange(value: string) {
    setStatus(value);
    const res = await updateCrmLead(lead!.businessId, { status: value });
    if (res.success) router.refresh();
    else alert(res.error);
  }

  async function handleSaveContactEmail() {
    setSavingEmail(true);
    try {
      const res = await setLeadContactEmail(lead!.id, contactEmail);
      if (!res.success) alert(res.error);
      else router.refresh();
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || addingNote) return;
    setAddingNote(true);
    try {
      const res = await addCrmNote(lead!.id, newNote.trim());
      if (res.success) {
        setNewNote("");
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    const res = await deleteCrmNote(noteId);
    if (res.success) router.refresh();
    else alert(res.error);
  }

  const tabs: { id: LeadModalTab; label: string; icon: ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <Building2 className="h-4 w-4" /> },
    {
      id: "conversation",
      label: "Conversation",
      icon: <MessageSquare className="h-4 w-4" />,
      badge: !conversationRead && unreadCount ? unreadCount : undefined,
    },
    { id: "notes", label: "Notes", icon: <StickyNote className="h-4 w-4" />, badge: noteCount || undefined },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate">{b.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {b.industry ?? "—"} · Lead score {b.leadScore ?? "—"} ·{" "}
                {CRM_LEAD_STATUS_LABEL[status] ?? status}
              </p>
              <CrmLeadTagList tags={lead.tags ?? []} className="mt-2" />
            </div>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px] h-9 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_LEAD_STATUSES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1 mt-3">
            {tabs.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant={tab === t.id ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-1.5", tab === t.id && "font-medium")}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">{t.badge}</span>
                )}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {tab === "overview" && (
            <div className="space-y-6">
              <CrmLeadTagsEditor businessId={lead.businessId} tags={lead.tags ?? []} />

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Contact</h4>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <AiTextField
                      value={contactEmail}
                      onChange={setContactEmail}
                      context="B2B lead contact email address"
                      placeholder="contact@company.com"
                      className="w-full"
                    />
                    <EmailSuggestionChips
                      suggestions={contactEmailSuggestions}
                      value={contactEmail}
                      onSelect={setContactEmail}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleSaveContactEmail} disabled={savingEmail}>
                    {savingEmail ? "Saving..." : "Save email"}
                  </Button>
                </div>
                <EmailResearchPanel
                  companyName={b.name}
                  website={b.website}
                  onSelectEmail={setContactEmail}
                />
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline w-fit">
                    <Phone className="h-4 w-4" />
                    {b.phone}
                  </a>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Company details</h4>
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  {b.address && (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Address</dt>
                      <dd>{b.address}</dd>
                    </div>
                  )}
                  {b.website && (
                    <div>
                      <dt className="text-muted-foreground">Website</dt>
                      <dd>
                        <a
                          href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {b.website.replace(/^https?:\/\//, "")}
                        </a>
                      </dd>
                    </div>
                  )}
                  {resolveBusinessSourceUrl(b) && (
                    <div>
                      <dt className="text-muted-foreground">Listing profile</dt>
                      <dd>
                        <ListingProfileLink business={b} className="flex items-center gap-1 text-primary hover:underline" />
                      </dd>
                    </div>
                  )}
                  {b.zipSearch && (
                    <div>
                      <dt className="text-muted-foreground">Found via</dt>
                      <dd>
                        <ListingSearchOrigin zipSearch={b.zipSearch} />
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Industry</dt>
                    <dd>{b.industry ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{b.size ?? "—"}</dd>
                  </div>
                  {b.employeeRange && (
                    <div>
                      <dt className="text-muted-foreground">Employees</dt>
                      <dd>{b.employeeRange}</dd>
                    </div>
                  )}
                  {b.hourlyRate && (
                    <div>
                      <dt className="text-muted-foreground">Hourly rate</dt>
                      <dd>{b.hourlyRate}</dd>
                    </div>
                  )}
                  {b.minProjectSize && (
                    <div>
                      <dt className="text-muted-foreground">Min. project size</dt>
                      <dd>{b.minProjectSize}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Rating</dt>
                    <dd>{b.rating != null ? `★ ${b.rating} (${b.reviews} reviews)` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Added to CRM</dt>
                    <dd>{new Date(lead.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
                {b.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs font-semibold uppercase mb-1">About</dt>
                    <dd className="text-sm leading-relaxed">{b.description}</dd>
                  </div>
                )}
              </section>

              <section className="flex flex-wrap gap-2">
                {resolveBusinessSourceUrl(b) && (
                  <a
                    href={resolveBusinessSourceUrl(b)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View on {sourceLabelForBusiness(b)}
                  </a>
                )}
                {b.website && (
                  <a
                    href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Visit website
                  </a>
                )}
                <a
                  href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(b.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                >
                  <Linkedin className="h-4 w-4 mr-1" />
                  LinkedIn
                </a>
                <Button type="button" variant="outline" size="sm" onClick={() => setTab("conversation")}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email conversation
                </Button>
              </section>
            </div>
          )}

          {tab === "conversation" && (
            <CrmLeadConversationPanel
              lead={lead}
              templates={templates}
              contactEmail={contactEmail}
            />
          )}

          {tab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y min-h-[78px]"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    size="sm"
                  >
                    {addingNote ? "..." : "Add note"}
                  </Button>
                </div>
              </div>
              {(lead.noteList ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(lead.noteList ?? []).map((n) => (
                    <li key={n.id} className="flex gap-2 rounded-md border bg-muted/30 p-3 text-sm group">
                      <span className="flex-1 whitespace-pre-wrap">{n.content}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-70 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteNote(n.id)}
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-3 flex justify-end bg-muted/20">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
