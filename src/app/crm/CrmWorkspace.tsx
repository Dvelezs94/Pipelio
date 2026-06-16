"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmViewToggle } from "./CrmViewToggle";
import { CrmSettingsDialog } from "./CrmSettingsDialog";
import { CrmTemplatesDialog } from "./CrmTemplatesDialog";
import { CrmInboxSyncButton } from "./CrmInboxSyncButton";
import type { CrmLeadRow } from "./CrmLeadsTable";
import type { ProposalSenderRow } from "@/app/actions/proposal-sender";
import type { SmtpConfigRow } from "@/app/actions/smtp-config";
import type { EmailTemplateRow } from "@/app/actions/email-templates";
import { Users } from "lucide-react";

export function CrmWorkspace({
  leads,
  proposalSender,
  smtpConfig,
  templates,
  workspaceName,
}: {
  leads: CrmLeadRow[];
  proposalSender: ProposalSenderRow | null;
  smtpConfig: SmtpConfigRow;
  templates: EmailTemplateRow[];
  workspaceName: string;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-muted-foreground" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">CRM – Leads</h1>
                <p className="text-sm text-muted-foreground">
                  Track leads, send emails, and manage outreach templates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <CrmTemplatesDialog templates={templates} />
              <CrmInboxSyncButton initialLastSyncedAt={smtpConfig.inboxLastSyncedAt} />
              <CrmSettingsDialog
                proposalSender={proposalSender}
                smtpConfig={smtpConfig}
                workspaceName={workspaceName}
              />
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to Search
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Saved leads ({leads.length})</CardTitle>
            <CardDescription>
              Canvas: drag leads between stages. Table view for email outreach and full details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrmViewToggle leads={leads} templates={templates} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
