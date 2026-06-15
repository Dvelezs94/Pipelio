/**
 * @typedef {Object} ScrapedCompany
 * @property {string} [externalId]
 * @property {string} name
 * @property {string|null} [website]
 * @property {string|null} [address]
 * @property {string|null} [email]
 * @property {string|null} [phone]
 * @property {string|null} [category]
 * @property {string|null} [industry]
 * @property {number} [reviews]
 * @property {number|null} [rating]
 * @property {string|null} [profileUrl]
 */

const SCRAPER_UTILS = {
  text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  },

  attr(el, name) {
    return el?.getAttribute?.(name)?.trim() || "";
  },

  absUrl(href, base = location.href) {
    if (!href) return null;
    try {
      return new URL(href, base).href;
    } catch {
      return null;
    }
  },

  parseNumber(raw) {
    if (raw == null) return 0;
    const n = parseFloat(String(raw).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  },

  parseInt(raw) {
    if (raw == null) return 0;
    const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  },

  hostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  },

  dedupe(companies) {
    const seen = new Set();
    const out = [];
    for (const c of companies) {
      const name = c.name?.trim();
      if (!name || name.length < 2) continue;
      const key = c.externalId || c.profileUrl || c.website || name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...c, name });
    }
    return out;
  },

  firstText(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      const t = this.text(el);
      if (t) return t;
    }
    return "";
  },

  firstHref(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      const href = el?.href || el?.getAttribute?.("href");
      const abs = this.absUrl(href);
      if (abs) return abs;
    }
    return null;
  },

  queryAll(selectors) {
    const nodes = new Set();
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((n) => nodes.add(n));
    }
    return [...nodes];
  },

  markSent(el) {
    el.dataset.crScraped = "1";
    el.classList.add("cr-scraper-sent");
  },

  isSent(el) {
    return el.dataset.crScraped === "1";
  },
};

globalThis.SCRAPER_UTILS = SCRAPER_UTILS;
