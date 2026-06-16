import { ExtensionKeysPanel } from "./ExtensionKeysPanel";
import { getScraperApiKeys } from "@/app/actions/scraper-api-keys";
import { Logo } from "@/components/Logo";
import { appTitle } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: appTitle("Extension"),
  description: "API keys for the Pipelio browser scraper extension",
};

export default async function ExtensionSettingsPage() {
  const keys = await getScraperApiKeys();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 space-y-1">
          <Logo size="lg" href="/" />
          <p className="text-sm text-muted-foreground">
            Manage API keys for the browser scraper and connect your projects.
          </p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <ExtensionKeysPanel initialKeys={keys} />
      </main>
    </div>
  );
}
