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
        max-width: 320px; pointer-events: none;
      }
      #cr-scraper-badge.err { background: #b91c1c; }
    `;
    document.documentElement.appendChild(style);
  }

  function showBadge(text, isError = false) {
    injectStyles();
    let el = document.getElementById("cr-scraper-badge");
    if (!el) {
      el = document.createElement("div");
      el.id = "cr-scraper-badge";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle("err", isError);
  }

  let pending = [];
  let lastRun = 0;
  let debounceTimer = null;
  let observer = null;
  let scrapeDebounce = null;
  let flushing = false;

  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["apiUrl", "apiKey", "workspaceId", "autoScrape", "sendIntervalSec"], (stored) => {
        const base = globalThis.EXTENSION_CONFIG || {};
        resolve({
          apiUrl: stored.apiUrl || base.API_URL || "http://localhost:3000",
          apiKey: stored.apiKey || base.API_KEY || "",
          workspaceId: stored.workspaceId ?? base.WORKSPACE_ID ?? "",
          autoScrape: stored.autoScrape ?? base.AUTO_SCRAPE ?? true,
          sendIntervalSec: stored.sendIntervalSec ?? base.SEND_INTERVAL_SEC ?? 3,
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

  function sendBatch(batch, config) {
    const extractor = globalThis.detectScraperExtractor?.();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "SCRAPE_BATCH",
          payload: {
            source: extractor?.id || "generic",
            searchLabel: document.title,
            pageUrl: location.href,
            companies: batch,
            workspaceId: config.workspaceId,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message || "Extension error" });
            return;
          }
          resolve(response || { ok: false, error: "No response from extension" });
        }
      );
    });
  }

  async function flushQueue(options = {}) {
    const { force = false, drain = false } = options;
    if (flushing && !force) return;

    const config = await getConfig();
    if (!config.apiKey) {
      showBadge("Set API key in extension popup", true);
      return;
    }
    if (!config.workspaceId) {
      showBadge("Select a project in extension popup", true);
      return;
    }
    if (pending.length === 0) return;

    const now = Date.now();
    const minGap = (config.sendIntervalSec || 3) * 1000;
    if (!force && !drain && now - lastRun < minGap) return;

    flushing = true;
    const batchSize = globalThis.EXTENSION_CONFIG?.BATCH_SIZE || 25;
    let totalImported = 0;
    let totalSkipped = 0;
    let lastError = null;

    try {
      do {
        if (pending.length === 0) break;

        const batch = pending.splice(0, batchSize);
        lastRun = Date.now();
        const extractor = globalThis.detectScraperExtractor?.();

        showBadge(`Sending ${batch.length} to Pipelio… (${pending.length} queued)`);

        const response = await sendBatch(batch, config);

        if (!response?.ok) {
          lastError = response?.error || "Send failed";
          pending.unshift(...batch);
          showBadge(`Error: ${lastError}`, true);
          break;
        }

        totalImported += response.imported || 0;
        totalSkipped += response.skipped || 0;
        chrome.runtime.sendMessage({ type: "STATS_UPDATE", payload: response });

        if (pending.length > 0) {
          showBadge(`Sent +${response.imported} · ${pending.length} left…`);
          await new Promise((r) => setTimeout(r, 400));
        }
      } while (drain && pending.length > 0);

      if (!lastError) {
        const extractor = globalThis.detectScraperExtractor?.();
        if (totalImported + totalSkipped > 0) {
          showBadge(
            `Done: ${totalImported} new, ${totalSkipped} duplicates (${extractor?.label || "page"})`
          );
        } else if (pending.length === 0) {
          showBadge(`Nothing new to import (${extractor?.label || "page"})`);
        }
      }
    } finally {
      flushing = false;
    }
  }

  function scheduleFlush(drain = false) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => flushQueue({ force: true, drain }), drain ? 300 : 800);
  }

  async function scrapeNow(force = false) {
    const config = await getConfig();

    if (!config.autoScrape && !force) {
      showBadge("Auto-scrape paused — use extension popup");
      return;
    }
    if (!config.apiKey || !config.workspaceId) {
      showBadge("Connect API key & project in extension popup", true);
      return;
    }

    const found = runScrape();
    if (found.length === 0) {
      if (force) {
        if (pending.length > 0) {
          await flushQueue({ force: true, drain: true });
        } else {
          showBadge("No new companies on this page");
        }
      }
      return;
    }

    pending.push(...found);
    const extractor = globalThis.detectScraperExtractor?.();
    showBadge(`Found ${found.length} · sending to Pipelio…`);
    await flushQueue({ force: true, drain: true });
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      clearTimeout(scrapeDebounce);
      scrapeDebounce = setTimeout(() => scrapeNow(false), 2000);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    injectStyles();
    const config = await getConfig();
    const extractor = globalThis.detectScraperExtractor?.();

    if (!config.apiKey || !config.workspaceId) {
      showBadge("Open extension → Connect & pick a project", true);
    } else {
      showBadge(`Pipelio ready · ${extractor?.label || "page"}`);
    }

    if (config.autoScrape) {
      setTimeout(() => scrapeNow(false), 1500);
      startObserver();
      setInterval(() => {
        if (pending.length > 0) flushQueue({ force: true, drain: true });
      }, (config.sendIntervalSec || 3) * 1000);
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
