/**
 * Content script: scrape listing pages and send batches to the background worker.
 */
(function () {
  const STYLE_ID = "cr-scraper-styles";
  const REVIEW_ID = "cr-scraper-review";

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
      #${REVIEW_ID} {
        position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
        width: min(360px, calc(100vw - 32px));
        background: #fff; color: #0f172a; font: 13px/1.45 system-ui, sans-serif;
        border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,.18);
        border: 1px solid #e2e8f0; overflow: hidden;
      }
      #${REVIEW_ID} .cr-head {
        padding: 12px 14px 8px; background: #f0fdfa; border-bottom: 1px solid #ccfbf1;
      }
      #${REVIEW_ID} .cr-head strong { display: block; font-size: 14px; margin-bottom: 2px; }
      #${REVIEW_ID} .cr-head span { color: #64748b; font-size: 12px; }
      #${REVIEW_ID} .cr-list {
        margin: 0; padding: 8px 14px; max-height: 180px; overflow-y: auto;
        list-style: none; border-bottom: 1px solid #e2e8f0;
      }
      #${REVIEW_ID} .cr-list li {
        padding: 4px 0; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #${REVIEW_ID} .cr-list li.muted { color: #64748b; font-style: italic; }
      #${REVIEW_ID} .cr-list li a { color: #0f766e; text-decoration: none; }
      #${REVIEW_ID} .cr-list li a:hover { text-decoration: underline; }
      #${REVIEW_ID} .cr-actions {
        display: flex; gap: 8px; padding: 10px 14px 12px;
      }
      #${REVIEW_ID} button {
        flex: 1; border: none; border-radius: 6px; padding: 8px 10px;
        font: inherit; font-weight: 600; cursor: pointer;
      }
      #${REVIEW_ID} .cr-send { background: #0f766e; color: #f0fdfa; }
      #${REVIEW_ID} .cr-discard { background: #f1f5f9; color: #0f172a; }
    `;
    document.documentElement.appendChild(style);
  }

  function showBadge(text, isError = false) {
    injectStyles();
    hideReviewPanel();
    let el = document.getElementById("cr-scraper-badge");
    if (!el) {
      el = document.createElement("div");
      el.id = "cr-scraper-badge";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle("err", isError);
    el.style.display = "block";
  }

  function hideBadge() {
    const el = document.getElementById("cr-scraper-badge");
    if (el) el.style.display = "none";
  }

  function hideReviewPanel() {
    const el = document.getElementById(REVIEW_ID);
    if (el) el.remove();
  }

  function previewItems(limit = 8) {
    return pending.slice(0, limit);
  }

  function showReviewPanel() {
    injectStyles();
    hideBadge();

    let panel = document.getElementById(REVIEW_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = REVIEW_ID;
      document.documentElement.appendChild(panel);
    }

    const extractor = globalThis.detectScraperExtractor?.();
    const items = previewItems(8);
    const extra = pending.length - items.length;

    panel.innerHTML = `
      <div class="cr-head">
        <strong>${pending.length} companies ready</strong>
        <span>${extractor?.label || "Listing page"} · review before sending to Pipelio</span>
      </div>
      <ul class="cr-list">
        ${items
          .map((c) => {
            const label = c.name.replace(/</g, "&lt;").replace(/"/g, "&quot;");
            if (c.profileUrl) {
              return `<li title="${label}"><a href="${c.profileUrl}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
            }
            return `<li title="${label}">${label}</li>`;
          })
          .join("")}
        ${extra > 0 ? `<li class="muted">…and ${extra} more</li>` : ""}
      </ul>
      <div class="cr-actions">
        <button type="button" class="cr-discard">Discard</button>
        <button type="button" class="cr-send">Send to Pipelio</button>
      </div>
    `;

    panel.querySelector(".cr-send").addEventListener("click", () => {
      confirmAndSend();
    });
    panel.querySelector(".cr-discard").addEventListener("click", () => {
      discardPending();
    });
  }

  let pending = [];
  let lastRun = 0;
  let debounceTimer = null;
  let observer = null;
  let scrapeDebounce = null;
  let flushing = false;

  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["apiUrl", "apiKey", "workspaceId", "autoScrape", "autoSend", "sendIntervalSec"],
        (stored) => {
          const base = globalThis.EXTENSION_CONFIG || {};
          resolve({
            apiUrl: stored.apiUrl || base.API_URL || "http://localhost:3000",
            apiKey: stored.apiKey || base.API_KEY || "",
            workspaceId: stored.workspaceId ?? base.WORKSPACE_ID ?? "",
            autoScrape: stored.autoScrape ?? base.AUTO_SCRAPE ?? true,
            autoSend: stored.autoSend ?? base.AUTO_SEND ?? false,
            sendIntervalSec: stored.sendIntervalSec ?? base.SEND_INTERVAL_SEC ?? 3,
          });
        }
      );
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
    if (flushing && !force) return { ok: false, error: "Already sending" };

    const config = await getConfig();
    if (!config.apiKey) {
      showBadge("Set API key in extension popup", true);
      return { ok: false, error: "API key not set" };
    }
    if (!config.workspaceId) {
      showBadge("Select a project in extension popup", true);
      return { ok: false, error: "No project selected" };
    }
    if (pending.length === 0) return { ok: true, imported: 0, skipped: 0 };

    const now = Date.now();
    const minGap = (config.sendIntervalSec || 3) * 1000;
    if (!force && !drain && now - lastRun < minGap) return { ok: false, error: "Rate limited" };

    flushing = true;
    hideReviewPanel();
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

      return { ok: !lastError, imported: totalImported, skipped: totalSkipped, error: lastError };
    } finally {
      flushing = false;
    }
  }

  async function afterScrapeFound(found, config) {
    pending.push(...found);

    if (config.autoSend) {
      showBadge(`Found ${found.length} · sending to Pipelio…`);
      await flushQueue({ force: true, drain: true });
      return;
    }

    showReviewPanel();
  }

  async function confirmAndSend() {
    if (pending.length === 0) {
      hideReviewPanel();
      showBadge("Nothing queued to send");
      return;
    }
    await flushQueue({ force: true, drain: true });
  }

  function discardPending() {
    pending = [];
    hideReviewPanel();
    showBadge("Queue discarded — scrape again when ready");
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
      if (force && pending.length > 0) {
        if (config.autoSend) {
          await flushQueue({ force: true, drain: true });
        } else {
          showReviewPanel();
        }
      } else if (force) {
        showBadge("No new companies on this page");
      }
      return;
    }

    await afterScrapeFound(found, config);
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
    } else if (config.autoSend) {
      showBadge(`Pipelio ready · ${extractor?.label || "page"} · auto-send on`);
    } else {
      showBadge(`Pipelio ready · ${extractor?.label || "page"} · manual send`);
    }

    if (config.autoScrape) {
      setTimeout(() => scrapeNow(false), 1500);
      startObserver();
    }

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "SCRAPE_NOW") {
        scrapeNow(true).then(() => sendResponse({ ok: true, pending: pending.length }));
        return true;
      }
      if (msg.type === "SEND_PENDING") {
        confirmAndSend().then((result) => sendResponse({ ok: true, pending: pending.length, ...result }));
        return true;
      }
      if (msg.type === "DISCARD_PENDING") {
        discardPending();
        sendResponse({ ok: true, pending: 0 });
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
          preview: previewItems(5).map((c) => c.name),
          previewUrls: previewItems(5).map((c) => c.profileUrl || null),
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
