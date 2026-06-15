# Client Research Browser Scraper

Chromium extension (Chrome, Opera, Edge, Brave) that scrapes SaaS and software company listings and sends them to the Client Research app.

## Supported sites

| Site | Source key |
|------|------------|
| [Clutch](https://clutch.co) | `clutch` |
| [Crunchbase](https://crunchbase.com) | `crunchbase` |
| [G2](https://g2.com) | `g2` |
| [Capterra](https://capterra.com) | `capterra` |
| [Product Hunt](https://producthunt.com) | `product_hunt` |
| [Y Combinator](https://ycombinator.com/companies) | `yc` |
| [Wellfound](https://wellfound.com) / AngelList | `wellfound` |
| [GoodFirms](https://goodfirms.co) | `goodfirms` |
| [GetApp](https://getapp.com) | `getapp` |
| [Software Advice](https://softwareadvice.com) | `software_advice` |
| [Built In](https://builtin.com) | `builtin` |
| [SoftwareSuggest](https://softwaresuggest.com) | `softwaresuggest` |
| [GitHub](https://github.com/search?q=org&type=users) org search | `github` |

Imported companies appear under **Database** (`/db`) grouped by browser extension source.

## Server setup

1. Add to your app `.env`:

```bash
SCRAPER_API_KEY=your-long-random-secret
# Optional: default workspace when extension does not send one
SCRAPER_WORKSPACE_ID=
```

2. Start the app (`npm run dev`).

3. API endpoints (auth: `x-scraper-key` header):

- `POST /api/scraper/import` — import scraped companies
- `GET /api/scraper/status` — health check
- `GET /api/scraper/workspaces` — list workspaces for setup

## Extension setup

1. Edit **`config.js`** in this folder:

```javascript
const EXTENSION_CONFIG = {
  API_URL: "http://localhost:3000",
  API_KEY: "your-long-random-secret",  // same as SCRAPER_API_KEY
  WORKSPACE_ID: "",                    // optional
  AUTO_SCRAPE: true,
};
```

2. Load unpacked in **Opera** or **Chrome**:
   - Opera: `opera://extensions` → Developer mode → **Load unpacked** → select this `extension/` folder
   - Chrome: `chrome://extensions` → Developer mode → **Load unpacked**

3. Open the extension popup to test the API connection and optionally pick a workspace.

4. Browse any supported listing site — scraping starts automatically. A teal badge in the bottom-right shows progress.

## Manual scrape

Click the extension icon → **Scrape this page now** on any supported tab.

## Notes

- Duplicate companies (same source + profile URL) are skipped automatically.
- Site DOMs change often; if a site stops working, update selectors in `content/extractors.js`.
- The extension sends data directly to your API using the scraper key (no app login required in the browser).
