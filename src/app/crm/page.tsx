import { getCrmLeads } from "@/app/actions/crm";
import { getProposalSender } from "@/app/actions/proposal-sender";
import { getSmtpConfig } from "@/app/actions/smtp-config";
import { getEmailTemplates } from "@/app/actions/email-templates";
import { type CrmLeadRow } from "./CrmLeadsTable";
import { CrmWorkspace } from "./CrmWorkspace";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [leads, proposalSender, smtpConfig, templates] = await Promise.all([
    getCrmLeads(),
    getProposalSender(),
    getSmtpConfig(),
    getEmailTemplates(),
  ]);

  const serialized: CrmLeadRow[] = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    noteList: (l.noteList ?? []).map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  }));

  return (
    <CrmWorkspace
      leads={serialized}
      proposalSender={proposalSender}
      smtpConfig={smtpConfig}
      templates={templates}
    />
  );
}
