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

  MAX_CATEGORY_LENGTH: 50,

  truncateCategory(value) {
    const t = (value || "").trim();
    if (!t) return "";
    if (t.length <= this.MAX_CATEGORY_LENGTH) return t;
    const cut = t.slice(0, this.MAX_CATEGORY_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > this.MAX_CATEGORY_LENGTH * 0.6) {
      return cut.slice(0, lastSpace).trimEnd();
    }
    return cut.trimEnd();
  },

  normalizeCategory(value, fallback = null) {
    const t = (value || "").trim();
    if (!t || this.isClutchPricingNoise(t)) return fallback;
    return this.truncateCategory(t) || fallback;
  },

  isClutchPricingNoise(text) {
    const t = (text || "").trim();
    if (!t) return true;
    if (/reviews mention/i.test(t)) return true;
    if (/avg\.?\s*project cost/i.test(t)) return true;
    if (/project highlight/i.test(t)) return true;
    if (/\d+\s+of\s+\d+/i.test(t) && /reviews?/i.test(t)) return true;
    if (/rating for cost/i.test(t)) return true;
    if (/most common project size/i.test(t)) return true;
    if (/what clients have said/i.test(t)) return true;
    return false;
  },

  isLikelyCategoryText(text) {
    const t = (text || "").trim();
    if (!t) return false;
    return !this.isClutchPricingNoise(t);
  },

  isInPricingSnapshot(el) {
    return !!el?.closest?.(".pricing-snapshot, [class*='pricing-snapshot'], [class*='pricing_snapshot']");
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
      out.push({
        ...c,
        name,
        category: c.category ? this.normalizeCategory(c.category, null) : c.category,
      });
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
      if (this.isInPricingSnapshot(el)) continue;
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

    // Clutch 2024+ highlight / stat blocks
    const statSelectors = [
      ".provider-info__highlight",
      ".provider-info .list-item",
      ".module-list .list-item",
      ".firm-details .list-item",
      "[class*='provider-stat']",
      "[class*='highlight']",
      "[class*='list-item']",
    ];
    const statTexts = new Set();
    for (const sel of statSelectors) {
      card.querySelectorAll(sel).forEach((el) => {
        if (this.isInPricingSnapshot(el)) return;
        const t = this.text(el);
        if (t && t.length < 80) statTexts.add(t);
      });
    }
    for (const t of statTexts) {
      if (!details.minProjectSize && /^\$[\d,]+(?:\+|k\+)/i.test(t)) details.minProjectSize = t;
      else if (!details.hourlyRate && (/\/\s*hr\b/i.test(t) || /^<\s*\$/.test(t))) details.hourlyRate = t;
      else if (
        !details.employeeRange &&
        /^\d[\d,]*\s*-\s*\d[\d,]*/.test(t) &&
        !/\$/.test(t) &&
        !/hr/i.test(t)
      ) {
        details.employeeRange = t;
      }
    }

    if (!details.minProjectSize || !details.hourlyRate || !details.employeeRange) {
      const items = [...card.querySelectorAll(".module-list .list-item, .provider-info .list-item, .firm-details .list-item")]
        .map((el) => this.text(el))
        .filter(Boolean);
      if (items.length >= 1 && !details.minProjectSize) details.minProjectSize = items[0];
      if (items.length >= 2 && !details.hourlyRate) details.hourlyRate = items[1];
      if (items.length >= 3 && !details.employeeRange) details.employeeRange = items[2];
    }

    const descSelectors = [
      '[class*="provider-insight"]',
      '[class*="provider__description"]',
      '[class*="directory-profile"]',
      '[class*="company-summary"]',
      '[class*="ai-insight"]',
      '[data-testid*="description"]',
      '[class*="description"]',
      "p.summary",
    ];
    for (const sel of descSelectors) {
      const el = card.querySelector(sel);
      if (!el || this.isInPricingSnapshot(el)) continue;
      const description = this.text(el);
      if (description && description.length > 40 && !this.isClutchPricingNoise(description)) {
        details.description = description;
        break;
      }
    }

    if (!details.description) {
      details.description = this.extractLongestNarrative(card, 60);
    }

    return details;
  },

  /** Longest prose block in a listing card (Clutch AI summary, G2 blurb, etc.). */
  extractLongestNarrative(card, minLen = 60) {
    let best = "";
    const skip =
      "button, a, h1, h2, h3, h4, nav, .rating-reviews, .module-list, [class*='chart'], [class*='legend'], .pricing-snapshot, [class*='pricing-snapshot']";
    card.querySelectorAll("p, div, span").forEach((el) => {
      if (el.closest(skip)) return;
      if (this.isInPricingSnapshot(el)) return;
      if (el.querySelector("p, div")) return;
      const t = this.text(el);
      if (t.length <= best.length || t.length < minLen) return;
      if (/^(view profile|visit website|see all|read more)$/i.test(t)) return;
      if (this.isClutchPricingNoise(t)) return;
      best = t;
    });
    return best || null;
  },

  extractServiceFocus(card) {
    const parts = [];
    const selectors = [
      ".chart-legend li",
      ".services-chart li",
      "[class*='service-focus'] li",
      "[class*='provider-service']",
      "[class*='services-list'] li",
    ];
    for (const sel of selectors) {
      card.querySelectorAll(sel).forEach((el) => {
        if (this.isInPricingSnapshot(el)) return;
        const fromData = el.getAttribute?.("data-service-line");
        const t =
          fromData && fromData !== "all" && this.isLikelyCategoryText(fromData)
            ? fromData
            : this.text(el);
        if (t && this.isLikelyCategoryText(t) && !parts.includes(t)) parts.push(t);
      });
      if (parts.length) break;
    }
    return parts.slice(0, 3).join(" · ");
  },

  buildClutchCategory(card) {
    const tagline = this.firstText(card, [
      ".tagline",
      ".company-tagline",
      "p.tagline",
      ".profile-summary__tagline",
      ".profile-header__tagline",
    ]);
    const services = this.extractServiceFocus(card);
    const candidates = [tagline, services].filter((t) => this.isLikelyCategoryText(t));
    if (!candidates.length) return "Agency / Dev Shop";
    let category = candidates[0];
    if (candidates[1] && category.length + 3 + candidates[1].length <= this.MAX_CATEGORY_LENGTH) {
      category = `${category} · ${candidates[1]}`;
    }
    return this.truncateCategory(category) || "Agency / Dev Shop";
  },

  isClutchProfilePage() {
    return /clutch\.co\/profile\//i.test(location.pathname);
  },

  extractClutchProfilePage() {
    const profileUrl = location.href.split("#")[0].split("?")[0];
    if (!profileUrl.includes("/profile/")) return [];

    const name =
      this.firstText(document, [
        "h1.profile-header__title",
        "h1.company-title",
        ".profile-header h1",
        "h1",
      ]) || this.nameFromClutchProfileUrl(profileUrl);
    if (!this.isLikelyCompanyName(name)) return [];

    const root =
      document.querySelector(".profile_header, .profile-header, .profile-summary, main") ||
      document.body;
    const tagline = this.firstText(root, [
      ".profile-summary__tagline",
      ".profile-header__tagline",
      ".tagline",
      "p.tagline",
    ]);
    const listing = this.extractAgencyListingDetails(root);
    const category = this.buildClutchCategory(root) !== "Agency / Dev Shop"
      ? this.buildClutchCategory(root)
      : this.isLikelyCategoryText(tagline)
        ? tagline
        : "Agency / Dev Shop";

    const website = this.firstHref(document, [
      "a.visit-website",
      "a[data-link-type='website']",
      "a[href*='utm_source=clutch']",
    ]);

    return [
      {
        externalId: profileUrl,
        name,
        profileUrl,
        website: website && !website.includes("clutch.co") ? website : null,
        address: this.labeledFieldValue(root, ["location", "headquarters"]) || null,
        category,
        industry: "Software Development",
        rating: this.parseNumber(
          this.firstText(root, ["span[itemprop='ratingValue']", ".rating", "[class*='rating']"])
        ) || null,
        reviews: this.parseInt(this.firstText(root, ["[itemprop='reviewCount']", ".reviews-count"])),
        description: listing.description,
        hourlyRate: listing.hourlyRate,
        minProjectSize: listing.minProjectSize,
        employeeRange: listing.employeeRange,
      },
    ];
  },
};

globalThis.SCRAPER_UTILS = SCRAPER_UTILS;
