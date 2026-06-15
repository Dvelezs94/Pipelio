import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCrmLeadIds } from "@/app/actions/crm";
import { requireWorkspaceId } from "@/lib/workspace";
import { ResultsDashboard } from "./ResultsDashboard";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await requireWorkspaceId();
  const [search, crmLeadIds] = await Promise.all([
    prisma.zipSearch.findFirst({
      where: { id, workspaceId },
      include: { businesses: true },
    }),
    getCrmLeadIds(),
  ]);

  if (!search) notFound();

  const initialBusinesses = search.businesses.map((b) => ({
    ...b,
    dismissedAt: b.dismissedAt?.toISOString() ?? null,
    viewedAt: b.viewedAt?.toISOString() ?? null,
  }));

  return (
    <ResultsDashboard
      searchId={search.id}
      industry={search.industry ?? undefined}
      searchSource={search.searchSource ?? undefined}
      searchQuery={search.searchQuery ?? undefined}
      zipCode={search.zipCode}
      radius={search.radius}
      center={
        search.lat && search.lng ? { lat: search.lat, lng: search.lng } : undefined
      }
      initialBusinesses={initialBusinesses}
      initialCrmLeadIds={crmLeadIds}
      mapApiKey={process.env.GOOGLE_MAPS_API_KEY ?? ""}
    />
  );
}
