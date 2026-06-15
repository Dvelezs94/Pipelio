/**
 * Default extension settings. Users paste their personal API key from
 * Pipelio → Extension settings after generating one in the app.
 */
const EXTENSION_CONFIG = {
  /** Base URL of your Pipelio app (no trailing slash) */
  API_URL: "https://pipelio-coral.vercel.app",

  /** Personal API key (plk_…) — set in the extension popup, not here in production */
  API_KEY: "",

  /** Selected project (workspace) ID — chosen in popup after connecting */
  WORKSPACE_ID: "",

  AUTO_SCRAPE: true,
  SEND_INTERVAL_SEC: 8,
  BATCH_SIZE: 25,
};

// eslint-disable-next-line no-undef
if (typeof globalThis !== "undefined") {
  globalThis.EXTENSION_CONFIG = EXTENSION_CONFIG;
}
