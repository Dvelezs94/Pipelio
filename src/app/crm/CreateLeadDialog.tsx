"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createManualLead } from "@/app/actions/crm";
import { INDUSTRIES, SIZES } from "@/lib/constants";
import { AiTextField } from "@/components/AiTextField";
import { Plus } from "lucide-react";
import { CRM_LEAD_STATUSES } from "@/lib/crm-statuses";

export function CreateLeadDialog({ onCreated }: { onCreated?: (leadId: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [size, setSize] = useState<string>("");
  const [status, setStatus] = useState<string>("new");
  const [initialNote, setInitialNote] = useState("");

  function resetForm() {
    setName("");
    setWebsite("");
    setIndustry(INDUSTRIES[0]);
    setContactEmail("");
    setPhone("");
    setAddress("");
    setSize("");
    setStatus("new");
    setInitialNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await createManualLead({
        name: name.trim(),
        website: website.trim() || null,
        industry: industry || null,
        contactEmail: contactEmail.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        size: size || null,
        status,
        initialNote: initialNote.trim() || null,
      });
      if (res.success) {
        resetForm();
        setOpen(false);
        router.refresh();
        if (res.data?.leadId) onCreated?.(res.data.leadId);
      } else {
        alert(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add lead manually</DialogTitle>
          <DialogDescription>
            Create a new company lead without running a search.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              Company name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Industry</label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRM_LEAD_STATUSES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Website</label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.com"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Contact email</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="ceo@company.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Address</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, Country"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Company size</label>
            <Select value={size || "none"} onValueChange={(v) => setSize(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {SIZES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Initial note</label>
            <AiTextField
              value={initialNote}
              onChange={setInitialNote}
              context="CRM lead note"
              placeholder="Optional note about this lead..."
              multiline
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
