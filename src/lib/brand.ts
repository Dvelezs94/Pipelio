export const APP_NAME = "Pipelio";
export const APP_TAGLINE =
  "Discover SaaS and software companies, build your pipeline, and manage outreach in one place.";
export const APP_DESCRIPTION =
  "Lead research and CRM for SaaS, software development, and internet companies.";

export function appTitle(page?: string): string {
  return page ? `${page} | ${APP_NAME}` : `${APP_NAME} | Lead pipeline & CRM`;
}
