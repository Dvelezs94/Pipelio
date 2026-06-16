import { SearchForm } from "./SearchForm";
import { RecentSearches } from "./RecentSearches";
import { getRecentSearches } from "@/app/actions/search";
import { Logo } from "@/components/Logo";
import { APP_TAGLINE } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recentSearches = await getRecentSearches(5);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 space-y-1">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
        <SearchForm />
        <RecentSearches searches={recentSearches} />
      </main>
    </div>
  );
}
