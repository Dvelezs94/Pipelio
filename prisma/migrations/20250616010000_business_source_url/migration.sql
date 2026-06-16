-- Store listing profile URLs (Clutch, G2, etc.) for extension imports
ALTER TABLE "Business" ADD COLUMN "sourceUrl" TEXT;

-- Backfill from placeId when it embeds a full URL (e.g. clutch:https://clutch.co/profile/…)
UPDATE "Business"
SET "sourceUrl" = (regexp_match("placeId", '^[^:]+:(https?://.+)$'))[1]
WHERE "sourceUrl" IS NULL
  AND "placeId" ~ '^[^:]+:https?://';
