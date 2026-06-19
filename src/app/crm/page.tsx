import { getCrmLeads } from "@/app/actions/crm";
import { getCrmPipelineColumns } from "@/app/actions/crm-pipeline";
import { getProposalSender } from "@/app/actions/proposal-sender";
import { getSmtpConfig } from "@/app/actions/smtp-config";
import { getEmailTemplates } from "@/app/actions/email-templates";
import { getCurrentWorkspace } from "@/lib/workspace";
import { type CrmLeadRow } from "./CrmLeadsTable";
import { CrmWorkspace } from "./CrmWorkspace";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [leads, proposalSender, smtpConfig, templates, workspace, columns] = await Promise.all([
    getCrmLeads(),
    getProposalSender(),
    getSmtpConfig(),
    getEmailTemplates(),
    getCurrentWorkspace(),
    getCrmPipelineColumns(),
  ]);

  const serialized: CrmLeadRow[] = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    lastMessageAt: l.lastMessageAt?.toISOString() ?? null,
    noteList: (l.noteList ?? []).map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  }));

  return (
    <CrmWorkspace
      leads={serialized}
      columns={columns}
      proposalSender={proposalSender}
      smtpConfig={smtpConfig}
      templates={templates}
      workspaceName={workspace.name}
    />
  );
}
