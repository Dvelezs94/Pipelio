# Business Research – Google Maps MVP

Production-ready MVP for **market research and lead generation**: search businesses by ZIP code, view by industry and size, filter, export, and map view.

## Stack

- **Next.js 14** (App Router), TypeScript, TailwindCSS
- **Prisma 7** + SQLite (+ `@prisma/adapter-better-sqlite3`)
- **Google APIs**: Geocoding, Places (Nearby + Details), Maps JavaScript
- **SWR**, Shadcn-style UI (Radix + Tailwind), Server Actions

## Setup

1. **Env**

   Copy `.env.example` to `.env` and set:

   - `GOOGLE_MAPS_API_KEY` – enable Geocoding API, Places API, Maps JavaScript API
   - `DATABASE_URL` – SQLite file URL (e.g. `file:./prisma/dev.db`); optional, defaults to `file:./prisma/dev.db`

2. **Database**

   ```bash
   npm run db:push
   # or: npm run db:migrate
   ```

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **ZIP search**: Enter ZIP + radius (1 / 5 / 10 / 25 km) → Geocoding + Places Nearby + Place Details
- **Industry**: Google types mapped to industries (Food & Beverage, Automotive, Healthcare, etc.) in `src/lib/industry-classification.ts`
- **Size**: Heuristic (reviews, franchise hints) in `src/lib/size-estimation.ts`
- **Results**: Grouped by industry → size (accordion), table (sort, search, pagination), map with markers
- **Filters**: Industry, size, min rating, has website, has phone, text search
- **Export**: CSV and JSON
- **Bonus**: Domain from website, lead score, LinkedIn company search link

## Project layout

- `src/app/` – App Router: `/` (search), `/results/[id]` (dashboard), `/api/search`, `/api/search/[id]`, `/api/businesses`
- `src/app/actions/` – Server actions: search, export
- `src/components/` – FiltersPanel, IndustryAccordion, BusinessTable, MapView; `ui/` for primitives
- `src/lib/` – db, google-places, industry-classification, size-estimation, rate-limit, constants
- `prisma/schema.prisma` – ZipSearch, Business
- **AGENTS.md** – Structure, scope, conventions (agents may update it)

## API

- `POST /api/search` – body: `{ zipCode, radiusKm }` → `{ searchId }` or `{ error }`
- `GET /api/search/:id` – saved search + businesses
- `GET /api/businesses` – query: `zipSearchId`, `industry`, `size`, `minRating`, `hasWebsite`, `hasPhone`, `search`, `page`, `limit`, `sortBy`, `sortOrder`

## Rate limiting & caching

- In-memory rate limit on search (see `src/lib/rate-limit.ts`). For production at scale, use Redis or similar.
- Same ZIP + radius within 60 minutes reuses the last search (no new Places calls).
