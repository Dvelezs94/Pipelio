"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setProposalSender, type ProposalSenderRow } from "@/app/actions/proposal-sender";
import { AiTextField } from "@/components/AiTextField";

export function ProposalSenderForm({ initial }: { initial: ProposalSenderRow | null }) {
  const router = useRouter();
  const [yourName, setYourName] = useState(initial?.yourName ?? "");
  const [yourTitle, setYourTitle] = useState(initial?.yourTitle ?? "");
  const [yourEmail, setYourEmail] = useState(initial?.yourEmail ?? "");
  const [yourPhone, setYourPhone] = useState(initial?.yourPhone ?? "");
  const [yourWebsite, setYourWebsite] = useState(initial?.yourWebsite ?? "");
  const [aiDraftContext, setAiDraftContext] = useState(initial?.aiDraftContext ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setYourName(initial.yourName ?? "");
      setYourTitle(initial.yourTitle ?? "");
      setYourEmail(initial.yourEmail ?? "");
      setYourPhone(initial.yourPhone ?? "");
      setYourWebsite(initial.yourWebsite ?? "");
      setAiDraftContext(initial.aiDraftContext ?? "");
    }
  }, [initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await setProposalSender({
        yourName: yourName.trim() || null,
        yourTitle: yourTitle.trim() || null,
        yourEmail: yourEmail.trim() || null,
        yourPhone: yourPhone.trim() || null,
        yourWebsite: yourWebsite.trim() || null,
        aiDraftContext: aiDraftContext.trim() || null,
      });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Used in email templates and AI-generated messages (signature: name, title, email, phone, website).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">Your name</label>
          <AiTextField value={yourName} onChange={setYourName} context="professional sender name" placeholder="Your name" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">Your title</label>
          <AiTextField value={yourTitle} onChange={setYourTitle} context="professional job title" placeholder="Your title" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">Your email</label>
          <AiTextField value={yourEmail} onChange={setYourEmail} context="professional contact email" placeholder="you@company.com" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">Your phone</label>
          <AiTextField value={yourPhone} onChange={setYourPhone} context="phone number" placeholder="Your phone" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-muted-foreground block mb-1">Your website</label>
          <AiTextField value={yourWebsite} onChange={setYourWebsite} context="company website URL" placeholder="https://uptinio.com" />
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-medium text-foreground block">AI draft context</label>
        <p className="text-xs text-muted-foreground">
          Instructions for the <strong>AI draft</strong> button in lead conversations — tone, product pitch, what to mention or avoid.
        </p>
        <textarea
          value={aiDraftContext}
          onChange={(e) => setAiDraftContext(e.target.value)}
          placeholder="e.g. We sell Uptinio, an uptime monitoring platform. Be consultative, not pushy. Mention we help SaaS teams catch outages before customers do. Keep under 120 words."
          rows={5}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y min-h-[100px]"
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save details"}
      </Button>
    </div>
  );
}
