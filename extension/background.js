/**
 * Background service worker: sends scraped batches to the Pipelio API.
 */
importScripts("config.js");

async function getSettings() {
  const stored = await chrome.storage.sync.get([
    "apiUrl",
    "apiKey",
    "workspaceId",
    "sendIntervalSec",
  ]);
  const base = globalThis.EXTENSION_CONFIG || {};
  return {
    apiUrl: (stored.apiUrl || base.API_URL || "http://localhost:3000").replace(/\/$/, ""),
    apiKey: stored.apiKey || base.API_KEY || "",
    workspaceId: stored.workspaceId ?? base.WORKSPACE_ID ?? "",
  };
}

async function apiFetch(path, options = {}) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    return { ok: false, error: "API key not set. Generate one in Pipelio → Extension and paste it in the popup." };
  }

  const headers = {
    "Content-Type": "application/json",
    "x-scraper-key": settings.apiKey,
    ...(settings.workspaceId ? { "x-workspace-id": settings.workspaceId } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${settings.apiUrl}${path}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

async function sendBatch(payload) {
  const settings = await getSettings();
  const workspaceId = payload.workspaceId || settings.workspaceId;
  if (!workspaceId) {
    return { ok: false, error: "No project selected. Open the extension popup and choose a project." };
  }

  const body = {
    source: payload.source,
    pageUrl: payload.pageUrl,
    searchLabel: payload.searchLabel,
    workspaceId,
    companies: payload.companies,
  };

  return apiFetch("/api/scraper/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCRAPE_BATCH") {
    sendBatch(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === "TEST_CONNECTION") {
    apiFetch("/api/scraper/status").then(sendResponse);
    return true;
  }

  if (message.type === "FETCH_WORKSPACES") {
    apiFetch("/api/scraper/workspaces").then(sendResponse);
    return true;
  }

  if (message.type === "STATS_UPDATE") {
    chrome.storage.local.get(["totalImported"], (prev) => {
      const totalImported = (prev.totalImported || 0) + (message.payload?.imported || 0);
      chrome.storage.local.set({
        totalImported,
        lastImport: message.payload,
      });
    });
  }
});
