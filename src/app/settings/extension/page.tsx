import { ExtensionKeysPanel } from "./ExtensionKeysPanel";
import { getScraperApiKeys } from "@/app/actions/scraper-api-keys";
import { appTitle } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: appTitle("Extension"),
  description: "API keys for the Pipelio browser scraper extension",
};

export default async function ExtensionSettingsPage() {
  const keys = await getScraperApiKeys();

  return <ExtensionKeysPanel initialKeys={keys} />;
}
