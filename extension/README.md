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

With **Auto-send** off (default), scraped companies stay queued until you review them on the page or in the popup and click **Send to Pipelio**.

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
- **Imports go to Database**, not CRM. Open **Database** in the nav to see scraped companies; use **Save to CRM** when you want them in the pipeline.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Badge says "Found N…" but nothing in the app | Reload the extension, **Connect**, pick a **project**, reload the Clutch tab, scrape again. With auto-send off, click **Send to Pipelio** on the review panel. |
| Wrong company names imported | Turn off **Auto-send**, scrape, review the preview panel, then send only when names look correct. |
| Nothing in CRM | Expected — extension imports to **Database** only. |
| Wrong app / empty Database | App URL in the popup must match where you sign in (`http://localhost:3000` for local dev, or your Vercel URL for production). |
| Red badge error | Read the message: set API key, select project, or fix connection. |
| Green outlines but no import (old session) | Full **reload** the listing page after updating the extension so cards can be scraped again. |
