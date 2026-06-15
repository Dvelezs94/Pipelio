import { SearchForm } from "./SearchForm";
import { RecentSearches } from "./RecentSearches";
import { getRecentSearches } from "@/app/actions/search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recentSearches = await getRecentSearches(5);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">Tech Company Research</h1>
          <p className="text-sm text-muted-foreground">
            Discover SaaS, e-commerce, and internet companies by industry for Uptinio outreach
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <SearchForm />
        <RecentSearches searches={recentSearches} />
      </main>
    </div>
  );
}
