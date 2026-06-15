const base = globalThis.EXTENSION_CONFIG || {};

const els = {
  apiUrl: document.getElementById("apiUrl"),
  apiKey: document.getElementById("apiKey"),
  workspaceSelect: document.getElementById("workspaceSelect"),
  autoScrape: document.getElementById("autoScrape"),
  connect: document.getElementById("connect"),
  save: document.getElementById("save"),
  scrapeNow: document.getElementById("scrapeNow"),
  pageInfo: document.getElementById("pageInfo"),
  status: document.getElementById("status"),
  stats: document.getElementById("stats"),
};

function setStatus(text, type = "") {
  els.status.textContent = text;
  els.status.className = `status ${type}`;
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(["apiUrl", "apiKey", "workspaceId", "autoScrape"]);

  els.apiUrl.value = stored.apiUrl || base.API_URL || "";
  els.apiKey.value = stored.apiKey || base.API_KEY || "";
  els.autoScrape.checked = stored.autoScrape ?? base.AUTO_SCRAPE ?? true;

  if (stored.apiKey && stored.apiUrl) {
    await connectAndLoadProjects(stored.workspaceId || "");
  }
}

async function saveSettings() {
  const workspaceId = els.workspaceSelect.value.trim();
  await chrome.storage.sync.set({
    apiUrl: els.apiUrl.value.trim().replace(/\/$/, ""),
    apiKey: els.apiKey.value.trim(),
    workspaceId,
    autoScrape: els.autoScrape.checked,
  });
  setStatus(workspaceId ? "Settings saved." : "Saved — select a project.", workspaceId ? "ok" : "");
}

function renderProjects(workspaces, selectedId) {
  if (!workspaces?.length) {
    els.workspaceSelect.innerHTML = '<option value="">No projects — create one in Pipelio</option>';
    els.workspaceSelect.disabled = true;
    return;
  }

  els.workspaceSelect.innerHTML = [
    '<option value="">Select a project…</option>',
    ...workspaces.map(
      (w) => `<option value="${w.id}"${w.id === selectedId ? " selected" : ""}>${w.name}</option>`
    ),
  ].join("");
  els.workspaceSelect.disabled = false;

  if (selectedId && workspaces.some((w) => w.id === selectedId)) {
    els.workspaceSelect.value = selectedId;
  }
}

async function connectAndLoadProjects(preferredWorkspaceId = "") {
  const apiUrl = els.apiUrl.value.trim().replace(/\/$/, "");
  const apiKey = els.apiKey.value.trim();

  if (!apiUrl || !apiKey) {
    setStatus("Enter app URL and API key.", "err");
    return false;
  }

  await chrome.storage.sync.set({ apiUrl, apiKey });
  setStatus("Connecting…");

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, (statusRes) => {
      if (chrome.runtime.lastError || !statusRes?.ok) {
        setStatus(statusRes?.error || chrome.runtime.lastError?.message || "Connection failed", "err");
        resolve(false);
        return;
      }

      chrome.runtime.sendMessage({ type: "FETCH_WORKSPACES" }, async (wsRes) => {
        if (!wsRes?.ok) {
          setStatus(wsRes?.error || "Failed to load projects", "err");
          resolve(false);
          return;
        }

        const preferred =
          preferredWorkspaceId ||
          els.workspaceSelect.value ||
          (await chrome.storage.sync.get(["workspaceId"])).workspaceId ||
          "";

        renderProjects(wsRes.workspaces, preferred);

        const workspaceId = els.workspaceSelect.value;
        if (workspaceId) {
          await chrome.storage.sync.set({ workspaceId });
          const name = wsRes.workspaces.find((w) => w.id === workspaceId)?.name;
          setStatus(`Connected · ${name || "project selected"}`, "ok");
        } else {
          setStatus(`Connected · ${wsRes.workspaces.length} project(s) — pick one`, "ok");
        }
        resolve(true);
      });
    });
  });
}

async function refreshPageInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_INFO" }, (info) => {
    if (chrome.runtime.lastError || !info) {
      els.pageInfo.textContent = "Open a supported listing site (reload tab after installing).";
      return;
    }
    els.pageInfo.textContent = `${info.label || info.source} · ${info.pending} queued · ${info.title?.slice(0, 60) || ""}`;
  });
}

async function scrapeNow() {
  const workspaceId = els.workspaceSelect.value;
  if (!workspaceId) {
    setStatus("Select a project first.", "err");
    return;
  }

  await saveSettings();

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
    els.stats.textContent = `Session: ${total} imported · Last: +${last.imported} new, ${last.skipped} dupes`;
  } else if (total) {
    els.stats.textContent = `Session: ${total} imported`;
  }
}

els.connect.addEventListener("click", () => connectAndLoadProjects());
els.save.addEventListener("click", saveSettings);
els.workspaceSelect.addEventListener("change", saveSettings);
els.scrapeNow.addEventListener("click", scrapeNow);

loadSettings().then(() => {
  refreshPageInfo();
  loadStats();
});
