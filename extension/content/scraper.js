/**
 * Content script: scrape listing pages and send batches to the background worker.
 */
(function () {
  const STYLE_ID = "cr-scraper-styles";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .cr-scraper-sent { outline: 2px solid rgba(15, 118, 110, 0.35) !important; outline-offset: 1px; }
      #cr-scraper-badge {
        position: fixed; bottom: 16px; right: 16px; z-index: 2147483646;
        background: #0f766e; color: #f0fdfa; font: 12px/1.4 system-ui, sans-serif;
        padding: 8px 12px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.2);
        max-width: 280px; pointer-events: none;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function showBadge(text) {
    injectStyles();
    let el = document.getElementById("cr-scraper-badge");
    if (!el) {
      el = document.createElement("div");
      el.id = "cr-scraper-badge";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
  }

  let pending = [];
  let lastRun = 0;
  let debounceTimer = null;
  let observer = null;

  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["apiUrl", "apiKey", "workspaceId", "autoScrape", "sendIntervalSec"], (stored) => {
        const base = globalThis.EXTENSION_CONFIG || {};
        resolve({
          apiUrl: stored.apiUrl || base.API_URL || "http://localhost:3000",
          apiKey: stored.apiKey || base.API_KEY || "",
          workspaceId: stored.workspaceId ?? base.WORKSPACE_ID ?? "",
          autoScrape: stored.autoScrape ?? base.AUTO_SCRAPE ?? true,
          sendIntervalSec: stored.sendIntervalSec ?? base.SEND_INTERVAL_SEC ?? 8,
        });
      });
    });
  }

  function runScrape() {
    const extractor = globalThis.detectScraperExtractor?.();
    if (!extractor) return [];
    try {
      return extractor.extract() || [];
    } catch (e) {
      console.warn("[Pipelio Scraper]", e);
      return [];
    }
  }

  async function flushQueue(force = false) {
    const config = await getConfig();
    if (!config.autoScrape && !force) return;
    if (!config.apiKey || !config.workspaceId) return;
    if (pending.length === 0) return;

    const now = Date.now();
    const minGap = (config.sendIntervalSec || 8) * 1000;
    if (!force && now - lastRun < minGap) return;

    const batchSize = globalThis.EXTENSION_CONFIG?.BATCH_SIZE || 25;
    const batch = pending.splice(0, batchSize);
    lastRun = now;

    const extractor = globalThis.detectScraperExtractor?.();
    chrome.runtime.sendMessage(
      {
        type: "SCRAPE_BATCH",
        payload: {
          source: extractor?.id || "generic",
          searchLabel: document.title,
          pageUrl: location.href,
          companies: batch,
          workspaceId: config.workspaceId || undefined,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          showBadge("Scraper: extension error");
          pending.unshift(...batch);
          return;
        }
        if (response?.ok) {
          showBadge(`Sent ${response.imported} new · ${response.skipped} dupes (${extractor?.label || "page"})`);
          chrome.runtime.sendMessage({ type: "STATS_UPDATE", payload: response });
        } else {
          showBadge(`Error: ${response?.error || "send failed"}`);
          pending.unshift(...batch);
        }
      }
    );
  }

  function scheduleFlush() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => flushQueue(false), 1500);
  }

  async function scrapeNow(force = false) {
    const config = await getConfig();
    if (!config.autoScrape && !force) {
      showBadge("Auto-scrape paused");
      return;
    }
    if (!config.apiKey || !config.workspaceId) {
      if (force) showBadge("Set API key & project in extension popup");
      return;
    }

    const found = runScrape();
    if (found.length === 0) {
      if (force) showBadge("No companies found on this page");
      return;
    }

    pending.push(...found);
    const extractor = globalThis.detectScraperExtractor?.();
    showBadge(`Found ${found.length} on ${extractor?.label || "page"}…`);
    scheduleFlush();
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      scrapeNow(false);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    injectStyles();
    const config = await getConfig();
    const extractor = globalThis.detectScraperExtractor?.();
    showBadge(`Pipelio: ${extractor?.label || "ready"}`);

    if (config.autoScrape) {
      setTimeout(() => scrapeNow(false), 1200);
      startObserver();
      setInterval(() => flushQueue(false), (config.sendIntervalSec || 8) * 1000);
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "SCRAPE_NOW") {
        scrapeNow(true).then(() => sendResponse({ ok: true }));
        return true;
      }
      if (msg.type === "GET_PAGE_INFO") {
        const ext = globalThis.detectScraperExtractor?.();
        sendResponse({
          source: ext?.id,
          label: ext?.label,
          url: location.href,
          title: document.title,
          pending: pending.length,
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
