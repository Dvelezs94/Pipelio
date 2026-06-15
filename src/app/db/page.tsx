import { DatabaseView } from "./DatabaseView";
import { appTitle } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: appTitle("Database"),
  description: "All companies in your Pipelio pipeline",
};

export default function DbPage() {
  return <DatabaseView />;
}
