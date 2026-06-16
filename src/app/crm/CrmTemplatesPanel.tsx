"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRM_EMAIL_TYPES, EMAIL_LANGUAGES, MESSAGE_CHANNELS } from "@/lib/email-types";
import {
  getEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplateRow,
} from "@/app/actions/email-templates";
import { AiTextField } from "@/components/AiTextField";
import { TemplateVariableField } from "@/components/TemplateVariableField";
import { invalidTemplatePlaceholders } from "@/lib/email-templates";
import { cn } from "@/lib/utils";
import { FileText, Plus, Trash2 } from "lucide-react";

export function CrmTemplatesPanel({ templates }: { templates: EmailTemplateRow[] }) {
  const router = useRouter();
  const [templateList, setTemplateList] = useState(templates);
  const [editing, setEditing] = useState<EmailTemplateRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(CRM_EMAIL_TYPES[0].value);
  const [channel, setChannel] = useState<string>(MESSAGE_CHANNELS[0].value);
  const [language, setLanguage] = useState<string>(EMAIL_LANGUAGES[0].value);
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const showEditor = isNew || editing !== null;

  useEffect(() => {
    setTemplateList(templates);
  }, [templates]);

  async function refreshTemplateList() {
    const updated = await getEmailTemplates();
    setTemplateList(updated);
    return updated;
  }

  function startNew() {
    setEditing(null);
    setIsNew(true);
    setName("");
    setType(CRM_EMAIL_TYPES[0].value);
    setChannel(MESSAGE_CHANNELS[0].value);
    setLanguage(EMAIL_LANGUAGES[0].value);
    setSubjectTemplate("");
    setBodyTemplate("");
  }

  function startEdit(t: EmailTemplateRow) {
    setIsNew(false);
    setEditing(t);
    setName(t.name);
    setType(t.type);
    setChannel(t.channel);
    setLanguage(t.language);
    setSubjectTemplate(t.subjectTemplate ?? "");
    setBodyTemplate(t.bodyTemplate);
  }

  function clearEditor() {
    setEditing(null);
    setIsNew(false);
  }

  async function handleSave() {
    if (!name.trim() || !bodyTemplate.trim()) {
      alert("Name and body template are required.");
      return;
    }
    const unknown = [
      ...invalidTemplatePlaceholders(subjectTemplate),
      ...invalidTemplatePlaceholders(bodyTemplate),
    ];
    if (unknown.length > 0) {
      const unique = [...new Set(unknown)];
      if (
        !confirm(
          `Unknown variables will stay blank when sending: ${unique.map((k) => `{{${k}}}`).join(", ")}. Save anyway?`
        )
      ) {
        return;
      }
    }
    setSaving(true);
    try {
      const res = await saveEmailTemplate({
        id: editing?.id,
        name: name.trim(),
        type,
        channel,
        language,
        subjectTemplate: subjectTemplate.trim() || null,
        bodyTemplate: bodyTemplate.trim(),
      });
      if (res.success) {
        await refreshTemplateList();
        clearEditor();
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await deleteEmailTemplate(id);
    if (res.success) {
      await refreshTemplateList();
      if (editing?.id === id) clearEditor();
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="flex h-full min-h-[360px] border rounded-lg overflow-hidden bg-card">
      <aside className="w-52 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Templates
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {templateList.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => startEdit(t)}
              className={cn(
                "w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors truncate",
                editing?.id === t.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {t.name}
            </button>
          ))}
          {templateList.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No templates yet.</p>
          )}
        </nav>
        <div className="p-2 border-t">
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" />
            New template
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto p-4">
        {showEditor ? (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="font-medium">{isNew ? "New template" : `Edit: ${editing?.name}`}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Use insert buttons or type {"{{"} for autocomplete. Variables are filled from the lead
                and your Proposal sender settings when the email is sent.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground block mb-1">Template name</label>
                <AiTextField value={name} onChange={setName} context="email template name" placeholder="My template" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRM_EMAIL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMAIL_LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground block mb-1">Subject template</label>
                <TemplateVariableField
                  value={subjectTemplate}
                  onChange={setSubjectTemplate}
                  aiContext="cold email subject template with placeholders"
                  placeholder="Subject with {{businessName}}"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground block mb-1">Body template</label>
                <TemplateVariableField
                  value={bodyTemplate}
                  onChange={setBodyTemplate}
                  aiContext="cold email body template with placeholders"
                  placeholder="Hi {{businessName}} team..."
                  multiline
                  rows={10}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Update template" : "Create template"}
              </Button>
              {editing && (
                <Button variant="destructive" size="icon" onClick={() => handleDelete(editing.id)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" onClick={clearEditor}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Select a template from the left, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
