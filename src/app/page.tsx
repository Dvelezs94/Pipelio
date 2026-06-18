import { SearchForm } from "./SearchForm";
import { RecentSearches } from "./RecentSearches";
import { getRecentSearches } from "@/app/actions/search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recentSearches = await getRecentSearches(5);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <SearchForm />
        <RecentSearches searches={recentSearches} />
      </main>
    </div>
  );
}
