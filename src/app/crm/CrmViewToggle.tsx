"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CrmLeadsTable, type CrmLeadRow } from "./CrmLeadsTable";
import { CrmCanvas } from "./CrmCanvas";
import { CrmLeadModal, type LeadModalTab } from "./CrmLeadModal";
import { CreateLeadDialog } from "./CreateLeadDialog";
import type { EmailTemplateRow } from "@/app/actions/email-templates";
import type { CrmPipelineColumnRow } from "@/app/actions/crm-pipeline";
import { CrmColumnsDialog } from "./CrmColumnsDialog";
import { LayoutGrid, Table } from "lucide-react";

export function CrmViewToggle({
  leads,
  columns,
  templates,
}: {
  leads: CrmLeadRow[];
  columns: CrmPipelineColumnRow[];
  templates: EmailTemplateRow[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"table" | "canvas">("canvas");
  const [modalLeadId, setModalLeadId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<LeadModalTab>("overview");
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const modalLead = modalLeadId ? leads.find((l) => l.id === modalLeadId) ?? null : null;

  useEffect(() => {
    if (pendingOpenId && leads.some((l) => l.id === pendingOpenId)) {
      setModalLeadId(pendingOpenId);
      setModalTab("overview");
      setPendingOpenId(null);
    }
  }, [leads, pendingOpenId]);

  function openLead(lead: CrmLeadRow, tab: LeadModalTab = "overview") {
    setModalLeadId(lead.id);
    setModalTab(tab);
  }

  function handleLeadCreated(leadId: string) {
    setPendingOpenId(leadId);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1">
            <Button
              type="button"
              variant={view === "canvas" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("canvas")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Canvas
            </Button>
            <Button
              type="button"
              variant={view === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("table")}
            >
              <Table className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <CrmColumnsDialog columns={columns} />
            <CreateLeadDialog columns={columns} onCreated={handleLeadCreated} />
          </div>
        </div>
        {view === "table" ? (
          <CrmLeadsTable leads={leads} columns={columns} templates={templates} onOpenLead={openLead} />
        ) : (
          <CrmCanvas leads={leads} columns={columns} onOpenLead={openLead} />
        )}
      </div>

      <CrmLeadModal
        lead={modalLead}
        columns={columns}
        templates={templates}
        open={!!modalLeadId}
        onOpenChange={(open) => {
          if (!open) {
            setModalLeadId(null);
            router.refresh();
          }
        }}
        initialTab={modalTab}
      />
    </>
  );
}
