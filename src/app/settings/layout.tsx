import { SettingsNav } from "./SettingsNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 space-y-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and integrations.
            </p>
          </div>
          <SettingsNav />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">{children}</main>
    </div>
  );
}
