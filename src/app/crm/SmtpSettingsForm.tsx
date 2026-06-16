"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSmtpConfig,
  setSmtpConfig,
  testEmailConfig,
  syncCrmInbox,
  type SmtpConfigRow,
} from "@/app/actions/smtp-config";
import {
  AUTH_METHOD_OPTIONS,
  IMAP_SECURITY_OPTIONS,
  SMTP_SECURITY_OPTIONS,
  type ConnectionSecurity,
} from "@/lib/mail-config";
import { AiTextField } from "@/components/AiTextField";
import { Loader2, Inbox } from "lucide-react";

export function SmtpSettingsForm({
  initial,
  workspaceName,
}: {
  initial: SmtpConfigRow;
  workspaceName: string;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  function update<K extends keyof SmtpConfigRow>(key: K, value: SmtpConfigRow[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function setSmtpSecurity(security: ConnectionSecurity) {
    setConfig((prev) => ({
      ...prev,
      smtpSecurity: security,
      secure: security === "ssl",
      port: security === "ssl" ? 465 : security === "starttls" ? 587 : prev.port,
    }));
  }

  function setImapSecurity(security: ConnectionSecurity) {
    setConfig((prev) => ({
      ...prev,
      imapSecurity: security,
      imapSecure: security === "ssl",
      imapPort: security === "ssl" ? 993 : security === "starttls" ? 143 : prev.imapPort,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await setSmtpConfig(config);
      if (res.success) {
        const saved = await getSmtpConfig();
        setConfig(saved);
        router.refresh();
      } else alert(res.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await testEmailConfig(config);
      alert(res.success ? "SMTP and IMAP connections OK." : res.error);
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncCrmInbox(config);
      if (res.success) {
        const imported = (res.data as { imported?: number })?.imported ?? 0;
        alert(`Inbox synced. ${imported} new message(s) imported.`);
        router.refresh();
      } else {
        alert(res.error);
      }
    } finally {
      setSyncing(false);
    }
  }

  const needsAuth = config.smtpAuth !== "none";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mail settings are saved for <span className="font-medium text-foreground">{workspaceName}</span> only.
        Configure SMTP to send emails and IMAP to receive replies (last 30 days).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">SMTP host</label>
          <Input
            placeholder="smtp.example.com"
            value={config.host ?? ""}
            onChange={(e) => update("host", e.target.value || null)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">SMTP port</label>
          <Input
            type="number"
            value={config.port}
            onChange={(e) => update("port", Number(e.target.value) || 587)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">Connection security</label>
          <Select value={config.smtpSecurity} onValueChange={(v) => setSmtpSecurity(v as ConnectionSecurity)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SMTP_SECURITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">Authentication</label>
          <Select value={config.smtpAuth} onValueChange={(v) => update("smtpAuth", v as SmtpConfigRow["smtpAuth"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUTH_METHOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsAuth && (
          <>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Username</label>
              <Input
                value={config.username ?? ""}
                onChange={(e) => update("username", e.target.value || null)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Password</label>
              <Input
                type="password"
                value={config.password ?? ""}
                onChange={(e) => update("password", e.target.value || null)}
                placeholder="Enter password"
              />
            </div>
          </>
        )}
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">From email</label>
          <Input
            type="email"
            value={config.fromEmail ?? ""}
            onChange={(e) => update("fromEmail", e.target.value || null)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">From name</label>
          <AiTextField
            value={config.fromName ?? ""}
            onChange={(v) => update("fromName", v || null)}
            context="email sender display name"
            placeholder="Your Name"
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-sm font-medium">IMAP (receive replies)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">IMAP host</label>
            <Input
              placeholder="imap.example.com"
              value={config.imapHost ?? ""}
              onChange={(e) => update("imapHost", e.target.value || null)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">IMAP port</label>
            <Input
              type="number"
              value={config.imapPort}
              onChange={(e) => update("imapPort", Number(e.target.value) || 993)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Connection security</label>
            <Select value={config.imapSecurity} onValueChange={(v) => setImapSecurity(v as ConnectionSecurity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAP_SECURITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden sm:block" />
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">IMAP username</label>
            <Input
              placeholder="Same as SMTP if empty"
              value={config.imapUsername ?? ""}
              onChange={(e) => update("imapUsername", e.target.value || null)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">IMAP password</label>
            <Input
              type="password"
              placeholder="Same as SMTP if empty"
              value={config.imapPassword ?? ""}
              onChange={(e) => update("imapPassword", e.target.value || null)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save mail settings"}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test email"}
        </Button>
        <Button variant="outline" onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Inbox className="h-4 w-4 mr-1" />
              Sync inbox
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
