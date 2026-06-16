-- Listing enrichment fields from browser extension / Clutch scraper
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "hourlyRate" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "minProjectSize" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "employeeRange" TEXT;
