/**
 * Site-specific extractors for SaaS / software company listing pages.
 * Each returns ScrapedCompany[] from the current document.
 */
(function () {
  const U = () => globalThis.SCRAPER_UTILS;

  function cardFromLink(link, defaults = {}) {
    const u = U();
    const name = u.text(link);
    const profileUrl = u.absUrl(link.href);
    if (!name || name.length < 2) return null;
    return {
      name,
      profileUrl,
      website: null,
      category: defaults.category || null,
      industry: defaults.industry || "SaaS / Software",
      ...defaults,
    };
  }

  const EXTRACTORS = {
    clutch: {
      id: "clutch",
      label: "Clutch",
      industry: "Software Development",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "li.provider-row",
          "div.provider-row",
          "article.provider",
          "div[data-company-id]",
          "a.directory_profile",
          "a[href*='/profile/']",
        ]);
        const results = [];
        const seenProfiles = new Set();

        for (const card of cards) {
          if (u.isSent(card)) continue;

          const link =
            card.tagName === "A" && card.href?.includes("/profile/")
              ? card
              : card.querySelector("a[href*='/profile/'], a.directory_profile, h3 a, h2 a");

          const name = link
            ? u.text(link)
            : u.firstText(card, [
                "h3.company-title a",
                "h3 a",
                ".company-title",
                "a.company-name",
                "[class*='company-title'] a",
              ]);

          if (!name || name.length < 2) continue;

          const profileUrl = link
            ? u.absUrl(link.href)
            : u.firstHref(card, ["h3.company-title a", "h3 a", "a[href*='/profile/']"]);

          if (profileUrl && seenProfiles.has(profileUrl)) continue;
          if (profileUrl) seenProfiles.add(profileUrl);

          const website = u.firstHref(card, [
            "a[href*='website']",
            "a.visit-website",
            "a[data-link-type='website']",
          ]);
          const ratingRaw = u.firstText(card, [
            ".rating",
            "[class*='rating']",
            "span[itemprop='ratingValue']",
          ]);
          const reviewsRaw = u.firstText(card, [
            ".reviews-count",
            "[class*='review-count']",
            "span[itemprop='reviewCount']",
          ]);
          const location = u.firstText(card, [".locality", ".location", "[class*='location']"]);
          const category = u.firstText(card, [".tagline", ".categories", "[class*='tagline']"]);

          results.push({
            externalId: profileUrl || `clutch:name:${name.toLowerCase().slice(0, 60)}`,
            name,
            profileUrl,
            website: website && !website.includes("clutch.co") ? website : null,
            address: location || null,
            category: category || "Agency / Dev Shop",
            industry: "Software Development",
            rating: u.parseNumber(ratingRaw) || null,
            reviews: u.parseInt(reviewsRaw),
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    crunchbase: {
      id: "crunchbase",
      label: "Crunchbase",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "search-result",
          "identifier-result",
          "[class*='result']",
          "a[href*='/organization/']",
          "a[href*='/company/']",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const link =
            card.tagName === "A"
              ? card
              : card.querySelector("a[href*='/organization/'], a[href*='/company/']");
          if (!link) continue;
          const name = u.text(link.querySelector("span") || link);
          const profileUrl = u.absUrl(link.href);
          if (!name || !profileUrl) continue;
          const meta = u.text(card);
          const locationMatch = meta.match(/([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/);
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            address: locationMatch ? locationMatch[1] : null,
            category: "Company",
            industry: "SaaS / Software",
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    g2: {
      id: "g2",
      label: "G2",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "[data-testid*='product']",
          ".product-card",
          "div[itemtype*='SoftwareApplication']",
          "article",
          ".c-product-card",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const name = u.firstText(card, [
            "[data-testid*='product-name']",
            "h3 a",
            "h2 a",
            ".product-name",
            "a[href*='/products/']",
          ]);
          if (!name) continue;
          const profileUrl = u.firstHref(card, ["a[href*='/products/']", "h3 a", "h2 a"]);
          const ratingRaw = u.firstText(card, [
            "[class*='rating']",
            "[aria-label*='star']",
            ".stars",
          ]);
          const reviewsRaw = u.firstText(card, ["[class*='review']", "[data-testid*='review']"]);
          const category = u.firstText(card, [".category", "[class*='category']"]);
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            category: category || "Software Product",
            industry: "SaaS / Software",
            rating: u.parseNumber(ratingRaw) || null,
            reviews: u.parseInt(reviewsRaw),
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    capterra: {
      id: "capterra",
      label: "Capterra",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "[data-testid*='product']",
          ".ProductCard",
          "article",
          "[class*='product-card']",
          "div[data-qa='product-card']",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const name = u.firstText(card, [
            "h2 a",
            "h3 a",
            "[data-testid*='product-name']",
            "a[href*='/software/']",
          ]);
          if (!name) continue;
          const profileUrl = u.firstHref(card, ["a[href*='/software/']", "h2 a", "h3 a"]);
          const ratingRaw = u.firstText(card, ["[class*='rating']", "[aria-label*='star']"]);
          const reviewsRaw = u.firstText(card, ["[class*='review']"]);
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            category: "Software Product",
            industry: "SaaS / Software",
            rating: u.parseNumber(ratingRaw) || null,
            reviews: u.parseInt(reviewsRaw),
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    product_hunt: {
      id: "product_hunt",
      label: "Product Hunt",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "[data-test='post-item']",
          "article[data-test]",
          "li[data-test]",
          ".styles_item__",
          "section a[href*='/posts/']",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const link = card.tagName === "A" ? card : card.querySelector("a[href*='/posts/'], a[href*='/products/']");
          if (!link) continue;
          const name = u.firstText(card, ["h3", "h2", "[data-test='post-name']", "strong"]);
          const profileUrl = u.absUrl(link.href);
          const tagline = u.firstText(card, ["[data-test='tagline']", "p", ".tagline"]);
          const websiteLink = card.querySelector("a[href*='?ref=producthunt'], a[data-test='visit-website']");
          const website = websiteLink ? u.absUrl(websiteLink.href) : null;
          if (!name) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            website,
            category: tagline || "Product",
            industry: "SaaS / Software",
            reviews: u.parseInt(u.firstText(card, ["[data-test='votes-count']", "[class*='vote']"])),
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    yc: {
      id: "yc",
      label: "Y Combinator",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const links = u.queryAll([
          "a[href*='/companies/']",
          "#company-list a",
          ".company-card a",
          "table a[href*='/companies/']",
        ]);
        const results = [];
        for (const link of links) {
          if (u.isSent(link)) continue;
          const href = link.href || "";
          if (!href.includes("/companies/") || href.endsWith("/companies") || href.endsWith("/companies/")) continue;
          const row = link.closest("tr, .company, li, article, div");
          const name = u.text(link);
          const profileUrl = u.absUrl(href);
          const desc = row ? u.firstText(row, ["p", ".description", "[class*='description']"]) : "";
          const location = row ? u.firstText(row, [".location", "[class*='location']"]) : "";
          const batch = row ? u.firstText(row, [".batch", "[class*='batch']"]) : "";
          if (!name || name.length < 2) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            address: location || null,
            category: batch ? `YC ${batch}` : "YC Startup",
            industry: "SaaS / Software",
          });
          u.markSent(link);
        }
        return u.dedupe(results);
      },
    },

    wellfound: {
      id: "wellfound",
      label: "Wellfound",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "[data-test='StartupCard']",
          ".startup-card",
          "a[href*='/company/']",
          "a[href*='/startups/']",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const link = card.tagName === "A" ? card : card.querySelector("a[href*='/company/'], a[href*='/startups/']");
          if (!link) continue;
          const name = u.text(link);
          const profileUrl = u.absUrl(link.href);
          const row = card.closest("div") || card;
          const tagline = u.firstText(row, ["p", ".tagline", "[class*='tagline']"]);
          if (!name) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            category: tagline || "Startup",
            industry: "SaaS / Software",
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    goodfirms: {
      id: "goodfirms",
      label: "GoodFirms",
      industry: "Software Development",
      extract() {
        const u = U();
        const cards = u.queryAll([
          ".firm-wrapper",
          ".company-card",
          "[class*='firm-']",
          "article",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const name = u.firstText(card, ["h3 a", "h2 a", ".company-name", "a[href*='/company/']"]);
          const profileUrl = u.firstHref(card, ["h3 a", "h2 a", "a[href*='/company/']"]);
          const website = u.firstHref(card, ["a[href*='website']", "a.visit-website"]);
          const ratingRaw = u.firstText(card, [".rating", "[class*='rating']"]);
          const reviewsRaw = u.firstText(card, [".reviews", "[class*='review']"]);
          if (!name) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            website: website && !website.includes("goodfirms.co") ? website : null,
            category: "Agency / Dev Shop",
            industry: "Software Development",
            rating: u.parseNumber(ratingRaw) || null,
            reviews: u.parseInt(reviewsRaw),
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    getapp: {
      id: "getapp",
      label: "GetApp",
      industry: "SaaS / Software",
      extract() {
        return EXTRACTORS.capterra.extract.call(this);
      },
    },

    software_advice: {
      id: "software_advice",
      label: "Software Advice",
      industry: "SaaS / Software",
      extract() {
        return EXTRACTORS.capterra.extract.call(this);
      },
    },

    builtin: {
      id: "builtin",
      label: "Built In",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "article",
          "[class*='company-card']",
          "a[href*='/company/']",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const link = card.tagName === "A" ? card : card.querySelector("a[href*='/company/']");
          if (!link) continue;
          const name = u.text(link);
          const profileUrl = u.absUrl(link.href);
          const location = u.firstText(card, [".location", "[class*='location']"]);
          if (!name) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            address: location || null,
            category: "Tech Company",
            industry: "SaaS / Software",
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    softwaresuggest: {
      id: "softwaresuggest",
      label: "SoftwareSuggest",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          ".listing-card",
          ".product-listing",
          "article",
          "[class*='software-card']",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const name = u.firstText(card, ["h2 a", "h3 a", ".title a", "a[href*='/software/']"]);
          const profileUrl = u.firstHref(card, ["h2 a", "h3 a", "a[href*='/software/']"]);
          const ratingRaw = u.firstText(card, [".rating", "[class*='rating']"]);
          if (!name) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            category: "Software Product",
            industry: "SaaS / Software",
            rating: u.parseNumber(ratingRaw) || null,
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    github: {
      id: "github",
      label: "GitHub",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const cards = u.queryAll([
          "[data-testid='results-list'] .search-title",
          ".user-list-item",
          "a[href^='https://github.com/'][data-hovercard-type='organization']",
          "div.org-listing",
        ]);
        const results = [];
        for (const card of cards) {
          if (u.isSent(card)) continue;
          const link =
            card.tagName === "A"
              ? card
              : card.querySelector("a[href^='https://github.com/']");
          if (!link) continue;
          const href = link.href || "";
          const parts = href.replace("https://github.com/", "").split("/");
          if (!parts[0] || parts.length > 2) continue;
          const name = u.text(link) || parts[0];
          const profileUrl = `https://github.com/${parts[0]}`;
          const desc = u.firstText(card.closest("li, div") || card, ["p", ".mb-1"]);
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            website: profileUrl,
            category: desc || "GitHub Organization",
            industry: "SaaS / Software",
          });
          u.markSent(card);
        }
        return u.dedupe(results);
      },
    },

    generic: {
      id: "generic",
      label: "Generic listing",
      industry: "SaaS / Software",
      extract() {
        const u = U();
        const results = [];
        const links = document.querySelectorAll(
          "a[href*='company'], a[href*='product'], a[href*='software'], a[href*='vendor'], a[href*='provider']"
        );
        for (const link of links) {
          if (u.isSent(link)) continue;
          const name = u.text(link);
          if (!name || name.length < 3 || name.length > 80) continue;
          if (/^(read more|learn more|view all|see all|next|prev)$/i.test(name)) continue;
          const profileUrl = u.absUrl(link.href);
          if (!profileUrl || profileUrl === location.href) continue;
          const parent = link.closest("article, li, tr, .card, [class*='card']");
          if (!parent) continue;
          results.push({
            externalId: profileUrl,
            name,
            profileUrl,
            category: "Listing",
            industry: "SaaS / Software",
          });
          u.markSent(link);
          if (results.length >= 40) break;
        }
        return u.dedupe(results);
      },
    },
  };

  const HOST_MAP = [
    { pattern: /(^|\.)clutch\.co$/i, key: "clutch" },
    { pattern: /(^|\.)crunchbase\.com$/i, key: "crunchbase" },
    { pattern: /(^|\.)g2\.com$/i, key: "g2" },
    { pattern: /(^|\.)capterra\.com$/i, key: "capterra" },
    { pattern: /(^|\.)producthunt\.com$/i, key: "product_hunt" },
    { pattern: /(^|\.)ycombinator\.com$/i, key: "yc" },
    { pattern: /(^|\.)wellfound\.com$/i, key: "wellfound" },
    { pattern: /(^|\.)angel\.co$/i, key: "wellfound" },
    { pattern: /(^|\.)goodfirms\.co$/i, key: "goodfirms" },
    { pattern: /(^|\.)getapp\.com$/i, key: "getapp" },
    { pattern: /(^|\.)softwareadvice\.com$/i, key: "software_advice" },
    { pattern: /(^|\.)builtin\.com$/i, key: "builtin" },
    { pattern: /(^|\.)softwaresuggest\.com$/i, key: "softwaresuggest" },
    { pattern: /(^|\.)github\.com$/i, key: "github" },
  ];

  function detectExtractor() {
    const host = location.hostname.replace(/^www\./, "");
    for (const { pattern, key } of HOST_MAP) {
      if (pattern.test(host)) return EXTRACTORS[key];
    }
    return EXTRACTORS.generic;
  }

  globalThis.SCRAPER_EXTRACTORS = EXTRACTORS;
  globalThis.detectScraperExtractor = detectExtractor;
})();
