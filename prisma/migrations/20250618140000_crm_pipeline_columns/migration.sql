-- CreateTable
CREATE TABLE "CrmPipelineColumn" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmPipelineColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmPipelineColumn_workspaceId_value_key" ON "CrmPipelineColumn"("workspaceId", "value");

-- AddForeignKey
ALTER TABLE "CrmPipelineColumn" ADD CONSTRAINT "CrmPipelineColumn_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default columns for existing workspaces
INSERT INTO "CrmPipelineColumn" ("id", "workspaceId", "value", "label", "sortOrder", "createdAt")
SELECT
  'col_' || w."id" || '_' || s.val,
  w."id",
  s.val,
  s.lbl,
  s.ord,
  NOW()
FROM "Workspace" w
CROSS JOIN (
  VALUES
    ('new', 'New', 0),
    ('contacted', 'Contacted', 10),
    ('qualified', 'Qualified', 20),
    ('not_qualified', 'Not qualified', 30),
    ('converted', 'Converted', 40)
) AS s(val, lbl, ord);
