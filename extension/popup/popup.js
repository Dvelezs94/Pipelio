const base = globalThis.EXTENSION_CONFIG || {};

const els = {
  apiUrl: document.getElementById("apiUrl"),
  apiKey: document.getElementById("apiKey"),
  workspaceId: document.getElementById("workspaceId"),
  workspaceSelect: document.getElementById("workspaceSelect"),
  autoScrape: document.getElementById("autoScrape"),
  save: document.getElementById("save"),
  test: document.getElementById("test"),
  scrapeNow: document.getElementById("scrapeNow"),
  loadWorkspaces: document.getElementById("loadWorkspaces"),
  pageInfo: document.getElementById("pageInfo"),
  status: document.getElementById("status"),
  stats: document.getElementById("stats"),
};

function setStatus(text, type = "") {
  els.status.textContent = text;
  els.status.className = `status ${type}`;
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get([
    "apiUrl",
    "apiKey",
    "workspaceId",
    "autoScrape",
  ]);

  els.apiUrl.value = stored.apiUrl || base.API_URL || "";
  els.apiKey.value = stored.apiKey || base.API_KEY || "";
  els.workspaceId.value = stored.workspaceId ?? base.WORKSPACE_ID ?? "";
  els.autoScrape.checked = stored.autoScrape ?? base.AUTO_SCRAPE ?? true;
}

async function saveSettings() {
  await chrome.storage.sync.set({
    apiUrl: els.apiUrl.value.trim().replace(/\/$/, ""),
    apiKey: els.apiKey.value.trim(),
    workspaceId: els.workspaceId.value.trim(),
    autoScrape: els.autoScrape.checked,
  });
  setStatus("Settings saved.", "ok");
}

async function testConnection() {
  await saveSettings();
  setStatus("Testing…");
  chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, (res) => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, "err");
      return;
    }
    if (res?.ok) {
      setStatus(`Connected. Workspace: ${res.workspaceId || "server default"}`, "ok");
      if (res.workspaceId && !els.workspaceId.value) {
        els.workspaceId.value = res.workspaceId;
      }
    } else {
      setStatus(res?.error || "Connection failed", "err");
    }
  });
}

async function loadWorkspaces() {
  await saveSettings();
  setStatus("Loading workspaces…");
  chrome.runtime.sendMessage({ type: "FETCH_WORKSPACES" }, (res) => {
    if (!res?.ok || !res.workspaces?.length) {
      setStatus(res?.error || "No workspaces found", "err");
      return;
    }
    els.workspaceSelect.innerHTML = res.workspaces
      .map((w) => `<option value="${w.id}">${w.name}</option>`)
      .join("");
    els.workspaceSelect.classList.remove("hidden");
    els.workspaceSelect.onchange = () => {
      els.workspaceId.value = els.workspaceSelect.value;
    };
    setStatus(`Loaded ${res.workspaces.length} workspace(s).`, "ok");
  });
}

async function refreshPageInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_INFO" }, (info) => {
    if (chrome.runtime.lastError || !info) {
      els.pageInfo.textContent = "This tab is not a supported listing page (or reload the page after installing).";
      return;
    }
    els.pageInfo.textContent = `${info.label || info.source} · ${info.pending} queued · ${info.title?.slice(0, 60) || ""}`;
  });
}

async function scrapeNow() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  setStatus("Scraping…");
  chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_NOW" }, () => {
    if (chrome.runtime.lastError) {
      setStatus("Cannot scrape this tab. Open a supported listing site.", "err");
      return;
    }
    setStatus("Scrape triggered. Check the badge on the page.", "ok");
    setTimeout(refreshPageInfo, 2000);
  });
}

async function loadStats() {
  const data = await chrome.storage.local.get(["totalImported", "lastImport"]);
  const total = data.totalImported || 0;
  const last = data.lastImport;
  if (last) {
    els.stats.textContent = `Total imported this session: ${total} · Last batch: +${last.imported} new, ${last.skipped} duplicates`;
  } else {
    els.stats.textContent = total ? `Total imported this session: ${total}` : "";
  }
}

els.save.addEventListener("click", saveSettings);
els.test.addEventListener("click", testConnection);
els.loadWorkspaces.addEventListener("click", loadWorkspaces);
els.scrapeNow.addEventListener("click", scrapeNow);

loadSettings().then(() => {
  refreshPageInfo();
  loadStats();
});
