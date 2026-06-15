"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeFromCrm, updateCrmLead, type CrmLeadWithBusiness } from "@/app/actions/crm";
import type { EmailTemplateRow } from "@/app/actions/email-templates";
import type { LeadModalTab } from "./CrmLeadModal";
import { ExternalLink, Phone, Linkedin, Trash2, Mail } from "lucide-react";
import { UnreadIndicator } from "./UnreadIndicator";
import { useRouter } from "next/navigation";
import { CRM_LEAD_STATUSES } from "@/lib/crm-statuses";

/** Serializable shape when passed from server (Date → string) */
export type CrmLeadRow = Omit<CrmLeadWithBusiness, "createdAt" | "noteList"> & {
  createdAt: string;
  noteList: Array<{ id: string; content: string; createdAt: string }>;
};

export function CrmLeadsTable({
  leads,
  onOpenLead,
}: {
  leads: CrmLeadRow[];
  templates?: EmailTemplateRow[];
  onOpenLead: (lead: CrmLeadRow, tab?: LeadModalTab) => void;
}) {
  const router = useRouter();

  const handleRemove = async (businessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await removeFromCrm(businessId);
    if (res.success) router.refresh();
    else alert(res.error);
  };

  const handleStatusChange = async (businessId: string, status: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await updateCrmLead(businessId, { status });
    router.refresh();
  };

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No leads yet. Run a search and click &quot;Save to CRM&quot; on any business to add it here.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Business</th>
            <th className="text-left p-3 font-medium">Industry</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Phone</th>
            <th className="text-left p-3 font-medium">Website</th>
            <th className="text-left p-3 font-medium">Lead score</th>
            <th className="text-left p-3 font-medium">Saved</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b hover:bg-muted/30 cursor-pointer"
              onClick={() => onOpenLead(lead)}
            >
              <td className="p-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  {lead.business.name}
                  {(lead.unreadInboxCount ?? 0) > 0 && (
                    <UnreadIndicator count={lead.unreadInboxCount} compact />
                  )}
                </span>
              </td>
              <td className="p-3 text-muted-foreground">{lead.business.industry ?? "—"}</td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={lead.status}
                  onValueChange={(v) => handleStatusChange(lead.businessId, v)}
                >
                  <SelectTrigger className="w-[120px] h-8">
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
              </td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                {lead.business.phone ? (
                  <a
                    href={`tel:${lead.business.phone}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {lead.business.phone}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                {lead.business.website ? (
                  <a
                    href={lead.business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Link
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="p-3">{lead.business.leadScore ?? "—"}</td>
              <td className="p-3 text-muted-foreground">
                {new Date(lead.createdAt).toLocaleDateString()}
              </td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onOpenLead(lead, "conversation")}
                    title="Email conversation"
                  >
                    <Mail className="h-3.5 w-3" />
                    Email
                    {(lead.unreadInboxCount ?? 0) > 0 && (
                      <UnreadIndicator count={lead.unreadInboxCount} className="ml-0.5" />
                    )}
                  </Button>
                  <a
                    href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(lead.business.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                    title="Search on LinkedIn"
                  >
                    <Linkedin className="h-3 w-3" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => handleRemove(lead.businessId, e)}
                    title="Remove from CRM"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
