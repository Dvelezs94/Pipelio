import type { Industry } from "./constants";

export type IndustrySourceConfig = {
  productHuntTopics?: string[];
  ycTags?: string[];
  ycIndustries?: string[];
  githubKeywords?: string[];
  clutchCatalogUrl?: string;
};

/** Maps each industry to data-source filters */
export const INDUSTRY_SOURCE_CONFIG: Record<Industry, IndustrySourceConfig> = {
  SaaS: {
    productHuntTopics: ["saas"],
    ycTags: ["saas", "b2b"],
    ycIndustries: ["B2B SaaS", "B2B"],
    githubKeywords: ["saas"],
    clutchCatalogUrl: "https://clutch.co/developers",
  },
  "E-commerce": {
    productHuntTopics: ["e-commerce"],
    ycTags: ["e-commerce", "marketplace"],
    ycIndustries: ["Consumer", "B2B"],
    githubKeywords: ["ecommerce", "e-commerce"],
    clutchCatalogUrl: "https://clutch.co/developers/ecommerce",
  },
  "Software Development": {
    productHuntTopics: ["developer-tools"],
    ycTags: ["developer-tools"],
    githubKeywords: ["software", "development"],
    clutchCatalogUrl: "https://clutch.co/developers",
  },
  "Developer Tools": {
    productHuntTopics: ["developer-tools", "open-source"],
    ycTags: ["developer-tools", "devtools"],
    ycIndustries: ["B2B"],
    githubKeywords: ["devtools", "developer-tools"],
    clutchCatalogUrl: "https://clutch.co/developers",
  },
  Fintech: {
    productHuntTopics: ["fintech"],
    ycTags: ["fintech"],
    ycIndustries: ["Fintech"],
    githubKeywords: ["fintech"],
    clutchCatalogUrl: "https://clutch.co/developers/financial-services",
  },
  "AI / Machine Learning": {
    productHuntTopics: ["artificial-intelligence"],
    ycTags: ["ai", "machine-learning", "generative-ai"],
    ycIndustries: ["AI"],
    githubKeywords: ["machine-learning", "artificial-intelligence"],
    clutchCatalogUrl: "https://clutch.co/developers/artificial-intelligence",
  },
  Cybersecurity: {
    productHuntTopics: ["security"],
    ycTags: ["security", "cybersecurity"],
    githubKeywords: ["security", "cybersecurity"],
    clutchCatalogUrl: "https://clutch.co/it-services/cybersecurity",
  },
  EdTech: {
    productHuntTopics: ["education"],
    ycTags: ["edtech", "education"],
    ycIndustries: ["Education"],
    githubKeywords: ["edtech", "education"],
    clutchCatalogUrl: "https://clutch.co/developers/education",
  },
  HealthTech: {
    productHuntTopics: ["health-fitness"],
    ycTags: ["healthtech", "digital-health"],
    ycIndustries: ["Healthcare"],
    githubKeywords: ["healthtech", "healthcare"],
    clutchCatalogUrl: "https://clutch.co/developers/healthcare",
  },
  Marketplace: {
    productHuntTopics: ["marketplace"],
    ycTags: ["marketplace"],
    ycIndustries: ["Consumer"],
    githubKeywords: ["marketplace"],
    clutchCatalogUrl: "https://clutch.co/developers",
  },
};
