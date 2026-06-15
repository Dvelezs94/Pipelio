"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CrmTemplatesPanel } from "./CrmTemplatesPanel";
import type { EmailTemplateRow } from "@/app/actions/email-templates";
import { FileText } from "lucide-react";

export function CrmTemplatesDialog({ templates }: { templates: EmailTemplateRow[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[min(85vh,720px)] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Email templates</DialogTitle>
          <DialogDescription>
            Create and edit outreach templates used when emailing leads.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 px-6 pb-6">
          <CrmTemplatesPanel templates={templates} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
