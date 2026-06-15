/**
 * One-time migration: add Workspace multi-tenancy and backfill existing rows.
 * Run: node scripts/migrate-workspaces.mjs
 */
import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") ?? path.join(__dirname, "../prisma/dev.db");
const db = new Database(dbPath);

const DEFAULT_WS_ID = "ws_default_0001";

function hasTable(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function hasColumn(table, col) {
  return db.prepare(`PRAGMA table_info("${table}")`).all().some((c) => c.name === col);
}

function cuid() {
  return "c" + randomBytes(12).toString("hex");
}

console.log(`Migrating ${dbPath}...`);
db.pragma("foreign_keys = OFF");

// 1. Workspace table
if (!hasTable("Workspace")) {
  db.exec(`
    CREATE TABLE "Workspace" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
  `);
}

if (!db.prepare('SELECT id FROM "Workspace" LIMIT 1').get()) {
  db.prepare('INSERT INTO "Workspace" (id, name, slug) VALUES (?, ?, ?)').run(
    DEFAULT_WS_ID,
    "Default",
    "default"
  );
}

const workspaceId =
  db.prepare('SELECT id FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1').get()?.id ?? DEFAULT_WS_ID;

// 2. ZipSearch.workspaceId
if (!hasColumn("ZipSearch", "workspaceId")) {
  db.exec(`ALTER TABLE "ZipSearch" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '${workspaceId}'`);
  db.exec(`UPDATE "ZipSearch" SET "workspaceId" = '${workspaceId}' WHERE "workspaceId" IS NULL OR "workspaceId" = ''`);
}

// 3. Business.workspaceId + composite unique on (workspaceId, placeId)
if (!hasColumn("Business", "workspaceId")) {
  db.exec(`ALTER TABLE "Business" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '${workspaceId}'`);
  db.exec(`UPDATE "Business" SET "workspaceId" = '${workspaceId}' WHERE "workspaceId" IS NULL OR "workspaceId" = ''`);

  // Recreate Business to drop global placeId unique and add composite unique
  db.exec(`
    CREATE TABLE "Business_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL,
      "placeId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "address" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "website" TEXT,
      "rating" REAL,
      "reviews" INTEGER NOT NULL DEFAULT 0,
      "category" TEXT,
      "industry" TEXT,
      "size" TEXT,
      "lat" REAL,
      "lng" REAL,
      "zipSearchId" TEXT NOT NULL,
      "domain" TEXT,
      "leadScore" INTEGER DEFAULT 0,
      "dismissedAt" DATETIME,
      "viewedAt" DATETIME,
      CONSTRAINT "Business_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Business_zipSearchId_fkey" FOREIGN KEY ("zipSearchId") REFERENCES "ZipSearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    INSERT INTO "Business_new" SELECT
      "id", "workspaceId", "placeId", "name", "address", "phone", "email", "website",
      "rating", "reviews", "category", "industry", "size", "lat", "lng", "zipSearchId",
      "domain", "leadScore", "dismissedAt", "viewedAt"
    FROM "Business";
    DROP TABLE "Business";
    ALTER TABLE "Business_new" RENAME TO "Business";
    CREATE UNIQUE INDEX "Business_workspaceId_placeId_key" ON "Business"("workspaceId", "placeId");
    CREATE INDEX "Business_workspaceId_idx" ON "Business"("workspaceId");
    CREATE INDEX "Business_zipSearchId_idx" ON "Business"("zipSearchId");
  `);
}

// 4. CrmEmailTemplate.workspaceId
if (hasTable("CrmEmailTemplate") && !hasColumn("CrmEmailTemplate", "workspaceId")) {
  db.exec(`ALTER TABLE "CrmEmailTemplate" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT '${workspaceId}'`);
  db.exec(`UPDATE "CrmEmailTemplate" SET "workspaceId" = '${workspaceId}'`);
}

// 5. CrmInboxMessage.workspaceId + composite messageId unique
if (hasTable("CrmInboxMessage") && !hasColumn("CrmInboxMessage", "workspaceId")) {
  db.exec(`
    CREATE TABLE "CrmInboxMessage_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "workspaceId" TEXT NOT NULL DEFAULT '${workspaceId}',
      "crmLeadId" TEXT,
      "messageId" TEXT NOT NULL,
      "fromEmail" TEXT NOT NULL,
      "fromName" TEXT,
      "subject" TEXT,
      "bodyText" TEXT,
      "bodyHtml" TEXT,
      "receivedAt" DATETIME NOT NULL,
      "inReplyTo" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CrmInboxMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CrmInboxMessage_crmLeadId_fkey" FOREIGN KEY ("crmLeadId") REFERENCES "CrmLead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
    INSERT INTO "CrmInboxMessage_new" (
      "id", "workspaceId", "crmLeadId", "messageId", "fromEmail", "fromName",
      "subject", "bodyText", "bodyHtml", "receivedAt", "inReplyTo", "createdAt"
    )
    SELECT
      "id", '${workspaceId}', "crmLeadId", "messageId", "fromEmail", "fromName",
      "subject", "bodyText", "bodyHtml", "receivedAt", "inReplyTo", "createdAt"
    FROM "CrmInboxMessage";
    DROP TABLE "CrmInboxMessage";
    ALTER TABLE "CrmInboxMessage_new" RENAME TO "CrmInboxMessage";
    CREATE UNIQUE INDEX "CrmInboxMessage_workspaceId_messageId_key" ON "CrmInboxMessage"("workspaceId", "messageId");
  `);
}

// 6. SmtpConfig: migrate from singleton id="default" to per-workspace
if (hasTable("SmtpConfig")) {
  if (!hasColumn("SmtpConfig", "workspaceId")) {
    const old = db.prepare('SELECT * FROM "SmtpConfig" WHERE id = ?').get("default");
    db.exec(`
      CREATE TABLE "SmtpConfig_new" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workspaceId" TEXT NOT NULL,
        "host" TEXT,
        "port" INTEGER NOT NULL DEFAULT 587,
        "secure" BOOLEAN NOT NULL DEFAULT 0,
        "smtpSecurity" TEXT NOT NULL DEFAULT 'starttls',
        "smtpAuth" TEXT NOT NULL DEFAULT 'plain',
        "username" TEXT,
        "password" TEXT,
        "fromEmail" TEXT,
        "fromName" TEXT,
        "imapHost" TEXT,
        "imapPort" INTEGER NOT NULL DEFAULT 993,
        "imapSecure" BOOLEAN NOT NULL DEFAULT 1,
        "imapSecurity" TEXT NOT NULL DEFAULT 'ssl',
        "imapUsername" TEXT,
        "imapPassword" TEXT,
        "inboxLastSyncedAt" DATETIME,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "SmtpConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    const newId = cuid();
    if (old) {
      db.prepare(`
        INSERT INTO "SmtpConfig_new" (
          id, workspaceId, host, port, secure, smtpSecurity, smtpAuth, username, password,
          fromEmail, fromName, imapHost, imapPort, imapSecure, imapSecurity, imapUsername, imapPassword,
          inboxLastSyncedAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        workspaceId,
        old.host,
        old.port,
        old.secure,
        old.smtpSecurity,
        old.smtpAuth,
        old.username,
        old.password,
        old.fromEmail,
        old.fromName,
        old.imapHost,
        old.imapPort,
        old.imapSecure,
        old.imapSecurity,
        old.imapUsername,
        old.imapPassword,
        old.inboxLastSyncedAt,
        old.updatedAt
      );
    } else {
      db.prepare(
        'INSERT INTO "SmtpConfig_new" (id, workspaceId, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)'
      ).run(newId, workspaceId);
    }
    db.exec('DROP TABLE "SmtpConfig"; ALTER TABLE "SmtpConfig_new" RENAME TO "SmtpConfig";');
    db.exec('CREATE UNIQUE INDEX "SmtpConfig_workspaceId_key" ON "SmtpConfig"("workspaceId");');
  }
}

// 7. ProposalSender: same pattern
if (hasTable("ProposalSender")) {
  if (!hasColumn("ProposalSender", "workspaceId")) {
    const old = db.prepare('SELECT * FROM "ProposalSender" WHERE id = ?').get("default");
    db.exec(`
      CREATE TABLE "ProposalSender_new" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "workspaceId" TEXT NOT NULL,
        "yourName" TEXT,
        "yourTitle" TEXT,
        "yourEmail" TEXT,
        "yourPhone" TEXT,
        "yourWebsite" TEXT,
        "aiDraftContext" TEXT,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ProposalSender_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    const newId = cuid();
    if (old) {
      db.prepare(`
        INSERT INTO "ProposalSender_new" (
          id, workspaceId, yourName, yourTitle, yourEmail, yourPhone, yourWebsite, aiDraftContext, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        workspaceId,
        old.yourName,
        old.yourTitle,
        old.yourEmail,
        old.yourPhone,
        old.yourWebsite,
        old.aiDraftContext,
        old.updatedAt
      );
    } else {
      db.prepare(
        'INSERT INTO "ProposalSender_new" (id, workspaceId, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)'
      ).run(newId, workspaceId);
    }
    db.exec('DROP TABLE "ProposalSender"; ALTER TABLE "ProposalSender_new" RENAME TO "ProposalSender";');
    db.exec('CREATE UNIQUE INDEX "ProposalSender_workspaceId_key" ON "ProposalSender"("workspaceId");');
  }
}

// 8. Per-workspace manual import search
const manualId = `crm-manual-import-${workspaceId}`;
const manual = db.prepare('SELECT id FROM "ZipSearch" WHERE id = ?').get("crm-manual-import");
if (manual) {
  db.prepare('UPDATE "ZipSearch" SET id = ?, workspaceId = ? WHERE id = ?').run(
    manualId,
    workspaceId,
    "crm-manual-import"
  );
  db.prepare('UPDATE "Business" SET zipSearchId = ? WHERE zipSearchId = ?').run(
    manualId,
    "crm-manual-import"
  );
}

db.pragma("foreign_keys = ON");
console.log("Migration complete. Default workspace id:", workspaceId);
db.close();
