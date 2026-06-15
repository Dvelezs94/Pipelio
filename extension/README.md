# Pipelio Browser Scraper

Chromium extension that scrapes SaaS and software company listings and sends them to your Pipelio app.

## Setup

### 1. Generate an API key in Pipelio

1. Sign in to your Pipelio app.
2. Go to **Extension** in the nav (or `/settings/extension`).
3. Click **Generate API key** and copy the `plk_…` key (shown once).

### 2. Configure the extension

1. Open the extension popup.
2. Enter your **App URL** (e.g. `https://your-app.vercel.app`).
3. Paste your **API key**.
4. Click **Connect** — your projects load in the dropdown.
5. Select a **Project** (where scraped companies are saved).
6. Click **Save**.

Browse supported listing sites to auto-scrape, or use **Scrape this page now**.

## Supported sites

Clutch · Crunchbase · G2 · Capterra · Product Hunt · Y Combinator · Wellfound · GoodFirms · GetApp · Software Advice · Built In · SoftwareSuggest · GitHub org search

## API (used by the extension)

All routes require header `x-scraper-key: plk_…` (your personal key).

| Route | Purpose |
|-------|---------|
| `GET /api/scraper/status` | Validate key |
| `GET /api/scraper/workspaces` | List your projects |
| `POST /api/scraper/import` | Import scraped companies (requires `workspaceId`) |

## Notes

- Each API key is tied to your user account and only accesses your projects.
- Revoke keys anytime from Pipelio → Extension settings.
- Reload listing tabs after changing extension settings.
