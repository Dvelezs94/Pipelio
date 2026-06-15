import { DatabaseView } from "./DatabaseView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Database | Business Research",
  description: "All companies from previous searches",
};

export default function DbPage() {
  return <DatabaseView />;
}
