/**
 * Edit these defaults before loading the extension in Chrome / Opera.
 * Popup settings override these values at runtime (stored in chrome.storage.sync).
 */
const EXTENSION_CONFIG = {
  /** Base URL of your Pipelio app (no trailing slash) */
  API_URL: "https://pipelio-coral.vercel.app",

  /** Must match SCRAPER_API_KEY in the app's .env */
  API_KEY: "ff29a971fb933536",

  /** Workspace ID from /db or GET /api/scraper/workspaces — leave empty to use server default */
  WORKSPACE_ID: "",

  /** Auto-scrape when visiting supported listing sites */
  AUTO_SCRAPE: false,

  /** Minimum seconds between API batches per tab */
  SEND_INTERVAL_SEC: 8,

  /** Max companies per API request */
  BATCH_SIZE: 25,
};

// eslint-disable-next-line no-undef
if (typeof globalThis !== "undefined") {
  globalThis.EXTENSION_CONFIG = EXTENSION_CONFIG;
}
