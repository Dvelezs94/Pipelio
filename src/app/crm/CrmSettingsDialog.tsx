"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProposalSenderForm } from "./ProposalSenderForm";
import { SmtpSettingsForm } from "./SmtpSettingsForm";
import type { ProposalSenderRow } from "@/app/actions/proposal-sender";
import type { SmtpConfigRow } from "@/app/actions/smtp-config";
import { getSmtpConfig } from "@/app/actions/smtp-config";
import { cn } from "@/lib/utils";
import { Settings, User, Mail } from "lucide-react";

type SettingsTab = "details" | "mail";

export function CrmSettingsDialog({
  proposalSender,
  smtpConfig,
  workspaceName,
}: {
  proposalSender: ProposalSenderRow | null;
  smtpConfig: SmtpConfigRow;
  workspaceName: string;
}) {
  const [tab, setTab] = useState<SettingsTab>("details");
  const [mailConfig, setMailConfig] = useState(smtpConfig);

  useEffect(() => {
    setMailConfig(smtpConfig);
  }, [smtpConfig]);

  useEffect(() => {
    if (tab !== "mail") return;
    void getSmtpConfig().then(setMailConfig);
  }, [tab]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>CRM settings</DialogTitle>
          <DialogDescription>Your sender profile and mail server configuration.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b pb-2">
          <Button
            type="button"
            variant={tab === "details" ? "secondary" : "ghost"}
            size="sm"
            className={cn("gap-1.5", tab === "details" && "font-medium")}
            onClick={() => setTab("details")}
          >
            <User className="h-4 w-4" />
            Your details
          </Button>
          <Button
            type="button"
            variant={tab === "mail" ? "secondary" : "ghost"}
            size="sm"
            className={cn("gap-1.5", tab === "mail" && "font-medium")}
            onClick={() => setTab("mail")}
          >
            <Mail className="h-4 w-4" />
            Mail server
          </Button>
        </div>

        {tab === "details" ? (
          <ProposalSenderForm initial={proposalSender} />
        ) : (
          <SmtpSettingsForm initial={mailConfig} workspaceName={workspaceName} />
        )}
      </DialogContent>
    </Dialog>
  );
}
