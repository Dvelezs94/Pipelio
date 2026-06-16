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
 * @property {string|null} [description]
 * @property {string|null} [hourlyRate]
 * @property {string|null} [minProjectSize]
 * @property {string|null} [employeeRange]
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

  isLikelyCompanyName(name) {
    const t = (name || "").trim();
    if (t.length < 2 || t.length > 100) return false;
    if (/^[\$€£]/.test(t)) return false;
    if (/\$[\d,]+/.test(t) && /\d,\d{3}/.test(t)) return false;
    if (/^\(\w{2,3}\)$/i.test(t)) return false;
    if (/^\d[\d,.\s]*(?:to|-)\s*\$?\d/i.test(t)) return false;
    if (/^(small|medium|large|enterprise)$/i.test(t)) return false;
    return true;
  },

  nameFromClutchProfileUrl(url) {
    const m = String(url || "").match(/clutch\.co\/profile\/([^/?#]+)/i);
    if (!m) return "";
    return m[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  },

  dedupe(companies) {
    const seen = new Set();
    const out = [];
    for (const c of companies) {
      const name = c.name?.trim();
      if (!name || !this.isLikelyCompanyName(name)) continue;
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

  /** Read labeled stat blocks (Clutch data-content, GoodFirms, etc.). */
  labeledFieldValue(root, labelMatchers) {
    const matchers = Array.isArray(labelMatchers) ? labelMatchers : [labelMatchers];
    const matches = (label) =>
      matchers.some((m) => (typeof m === "string" ? label.includes(m) : m.test(label)));

    for (const el of root.querySelectorAll("[data-content], [data-title], dt, .label, .field-label")) {
      const raw =
        el.getAttribute("data-content") ||
        el.getAttribute("data-title") ||
        this.text(el);
      const label = raw.replace(/<\/?i>/gi, "").trim().toLowerCase();
      if (!label || !matches(label)) continue;

      const value =
        this.text(el.querySelector("span, dd, .field-value, .value")) ||
        this.text(el.nextElementSibling);
      if (value && value.toLowerCase() !== label) return value;
    }

    return "";
  },

  /** Agency listing stats: min project, hourly rate, employees (ordered list-item fallback). */
  extractAgencyListingDetails(card) {
    const details = {
      minProjectSize: null,
      hourlyRate: null,
      employeeRange: null,
      description: null,
    };

    const minProject = this.labeledFieldValue(card, ["min. project", "min project", "project size"]);
    const hourly = this.labeledFieldValue(card, ["hourly rate", "avg. hourly", "average hourly"]);
    const employees = this.labeledFieldValue(card, ["employee", "team size", "company size"]);

    if (minProject) details.minProjectSize = minProject;
    if (hourly) details.hourlyRate = hourly;
    if (employees) details.employeeRange = employees;

    if (!details.minProjectSize || !details.hourlyRate || !details.employeeRange) {
      const items = [...card.querySelectorAll(".module-list .list-item, .provider-info .list-item, .firm-details .list-item")]
        .map((el) => this.text(el))
        .filter(Boolean);
      if (items.length >= 1 && !details.minProjectSize) details.minProjectSize = items[0];
      if (items.length >= 2 && !details.hourlyRate) details.hourlyRate = items[1];
      if (items.length >= 3 && !details.employeeRange) details.employeeRange = items[2];
    }

    const descEl = card.querySelector(
      '[class*="description"], [class*="provider-insight"], [class*="company-summary"], [class*="ai-insight"], p.summary'
    );
    const description = this.text(descEl);
    if (description && description.length > 20) details.description = description;

    return details;
  },

  extractServiceFocus(card) {
    const parts = [];
    const selectors = [
      ".chart-legend li",
      ".services-chart li",
      "[class*='service-focus'] li",
      "[class*='service-line']",
    ];
    for (const sel of selectors) {
      card.querySelectorAll(sel).forEach((el) => {
        const t = this.text(el);
        if (t && !parts.includes(t)) parts.push(t);
      });
      if (parts.length) break;
    }
    return parts.slice(0, 3).join(" · ");
  },
};

globalThis.SCRAPER_UTILS = SCRAPER_UTILS;
