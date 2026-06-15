# Pipelio

Lead research and CRM for SaaS, software development, and internet companies. Search by industry, scrape listing sites, manage a pipeline, and run outreach from one app.

## Stack

- **Next.js 14** (App Router), TypeScript, TailwindCSS
- **Prisma 7** + **PostgreSQL (Supabase)** + `@prisma/adapter-pg`
- **Google APIs**: Geocoding, Places (Nearby + Details), Maps JavaScript
- **SWR**, Shadcn-style UI (Radix + Tailwind), Server Actions

## Setup

1. **Supabase project**

   Create a project at [supabase.com](https://supabase.com). In **Project Settings → Database**, copy the **URI** (direct connection):

   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
   ```

2. **Env**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – your Supabase URI (add `?sslmode=require` at the end)
   - `AUTH_SECRET` – session signing secret
   - `GOOGLE_MAPS_API_KEY` – optional, for map view

   `DIRECT_URL` is optional; if omitted, Prisma migrations use `DATABASE_URL`.

3. **Database**

   ```bash
   npm run db:migrate
   # production: npm run db:deploy
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Industry search**: Find SaaS, e-commerce, and dev shops via Product Hunt, YC, GitHub, Clutch
- **Browser scraper extension**: Import leads from G2, Crunchbase, Product Hunt, and more
- **CRM**: Track leads, send emails, sync inbox, manage templates
- **Database**: All companies across searches; filter, sort, export
- **Lead scoring**: Website, email, reviews, ratings

## Project layout

- `src/app/` – App Router: search, results, CRM, database, auth
- `src/lib/brand.ts` – App name and taglines
- `extension/` – Pipelio browser scraper (Chromium)
- `prisma/schema.prisma` – PostgreSQL schema
- **AGENTS.md** – Structure and conventions for agents

## API

- `POST /api/search` – industry search
- `GET /api/businesses` – list/filter companies
- `POST /api/scraper/import` – browser extension import (scraper API key)

## Rate limiting & caching

- In-memory rate limit on search (see `src/lib/rate-limit.ts`).
- Same industry + sources within 60 minutes reuses the last search.
