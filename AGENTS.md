# Agent guide: Business Research (Google Maps) MVP

**Purpose:** This file describes project structure, scope, and important conventions. **Agents and maintainers may update this file** as the codebase evolves (new features, refactors, or structural changes). Keep it accurate and concise.

---

## Project overview

- **Stack:** Next.js 14 (App Router), TypeScript, TailwindCSS, Prisma (PostgreSQL / Supabase), Google Places + Geocoding + Maps JS API, SWR, Shadcn-style UI (Radix + Tailwind).
- **Goal:** Market research / lead generation: user enters a ZIP code, app returns businesses in that area, categorized by industry and estimated company size, with filters, table view, map, and export (CSV/JSON).

---

## Key directories and files

| Path | Purpose |
|------|--------|
| `src/app/` | App Router: `page.tsx` (search form), `results/[id]/`, `chat/` (agent chat), `api/search`, `api/search/[id]`, `api/businesses` |
| `src/app/actions/` | Server Actions: `search.ts` (ZIP + text search), `export.ts`, `crm.ts`, `agent.ts` (recommendation + run searches & add to CRM) |
| `src/components/` | UI: `FiltersPanel`, `IndustryAccordion`, `BusinessTable`, `MapView`; `ui/` for primitives (Button, Input, Card, Select, Checkbox, Accordion) |
| `src/lib/` | Shared logic: `db.ts`, `utils.ts`, `constants.ts`, `industry-classification.ts`, `size-estimation.ts`, `google-places.ts`, `rate-limit.ts`, `agent.ts` (DeepSeek recommendation) |
| `src/types/` | Shared TS types: `BusinessRecord`, `ZipSearchRecord`, `BusinessFilters` |
| `prisma/schema.prisma` | Models: User, Workspace, ZipSearch, Business, CrmLead, … |
| `prisma.config.ts` | Prisma 7 config; `DIRECT_URL` for CLI migrations, app uses `DATABASE_URL` (Supabase pooler) |

---

## Data flow

1. **Search:** User submits ZIP + radius on `/` → Server Action `searchBusinesses` → Geocoding (ZIP → lat/lng) → Places Nearby Search (paginated) → Place Details per result → classify industry, estimate size, compute lead score → save `ZipSearch` + `Business` → redirect to `/results/[id]`.
2. **Results:** `/results/[id]` loads search + businesses from DB; client state holds filters; views: Table (sort, search, pagination, **Save to CRM** button), Accordion (industry → size), Map (markers + info window). Export uses server actions that read from DB for the same `searchId`.
3. **CRM:** `/crm` lists leads saved via “Save to CRM.” Each lead has status (new / contacted / qualified / converted), notes, and link to business details. Leads are stored in `CrmLead` (one per business).
4. **Database:** `/db` lists all companies ever stored from any search. Filter, sort, paginate; "From search" links to original results; "Save to CRM" per row. Uses `GET /api/businesses?includeZipSearch=true`.
5. **Chat agent:** `/chat` – User describes business needs; agent (DeepSeek) recommends industries and suggested location searches (e.g. "restaurants in 64060 Mexico"). User can click "Run searches & add top leads to CRM"; app runs Places Text Search for each suggestion, then adds top leads (by lead score) to CRM.

---

## Conventions

- **Industry:** Mapped from Google Place types in `src/lib/industry-classification.ts`. Add new mappings there.
- **Size:** Heuristic in `src/lib/size-estimation.ts` (reviews, franchise name list). Adjust thresholds there.
- **Lead score:** Computed in `search.ts` (website, phone, reviews, rating). Stored on `Business.leadScore`.
- **Rate limiting:** In-memory in `src/lib/rate-limit.ts` (per identifier). For production at scale, replace with Redis or similar.
- **Caching:** Reuse existing `ZipSearch` if same ZIP + radius + country and created &lt; 60 minutes (see `searchBusinesses`). `ZipSearch.countryCode` (e.g. US, MX) ensures 64480 Mexico is not reused as 64480 US.
- **Geocoding:** Country is required so the same postal code resolves correctly (e.g. 64480 → Monterrey when country is Mexico). See `google-places.ts` and search form country selector.

---

## Environment

- `GOOGLE_MAPS_API_KEY` – used for Geocoding, Places (Nearby + Text Search + Details), and Maps JavaScript API (map view).
- `DEEPSEEK_API_KEY` – used for the chat agent (industry/location recommendations) and CRM cold email generation.
- `DATABASE_URL` – Supabase Postgres URI (direct connection, port 5432). See `.env.example`.
- `DIRECT_URL` – optional; Prisma CLI falls back to `DATABASE_URL` if unset.

See `.env.example` for a template.

---

## API routes

- `POST /api/search` – Body: `{ zipCode, radiusKm }`. Runs search, returns `{ searchId }` or `{ error }`.
- `GET /api/search/:id` – Returns saved search with `businesses`.
- `GET /api/businesses` – Query params: `zipSearchId`, `industry`, `size`, `minRating`, `hasWebsite`, `hasPhone`, `search`, `page`, `limit`, `sortBy`, `sortOrder`, `includeZipSearch` (true to include zipSearch per business). Returns `{ businesses, pagination }`.

---

## Bonus features implemented

- **Company domain:** Extracted from website URL and stored in `Business.domain`.
- **LinkedIn:** Table has “LinkedIn” column with link to LinkedIn company search by business name.
- **Lead scoring:** 0–100 from website, phone, reviews, rating; stored on `Business.leadScore`.
- **CRM:** Save businesses from search results to an in-app CRM (`/crm`). Track status (new → contacted → qualified → converted) and remove leads.
- **Database:** `/db` shows all companies from all previous searches; filter, sort, paginate, link to original search, save to CRM.
- **Chat agent:** `/chat` – Describe your business; agent recommends industries and location-based searches, then can run those searches and add top leads to CRM. Nav: Search, Chat, Database, CRM.

---

## Updating this file

When you add features, change structure, or refactor:

1. Update the relevant sections above (paths, data flow, env, API, conventions).
2. Add or remove rows in the directory table as needed.
3. Keep the “Purpose” line at the top so future agents know this file is maintained and can be edited.
