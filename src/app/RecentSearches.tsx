import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentSearchItem } from "@/app/actions/search";
import { Clock, ChevronRight } from "lucide-react";

export function RecentSearches({ searches }: { searches: RecentSearchItem[] }) {
  if (searches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Recent searches
        </CardTitle>
        <CardDescription>Jump back to your last {searches.length} result sets</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {searches.map((search) => (
            <li key={search.id}>
              <Link
                href={`/results/${search.id}`}
                className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{search.label}</p>
                  <p className="text-sm text-muted-foreground truncate">{search.detail}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
