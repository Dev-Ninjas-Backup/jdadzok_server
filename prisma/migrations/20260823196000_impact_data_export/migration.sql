CREATE TABLE "impact_data_export_logs" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impact_data_export_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "impact_data_export_logs_requestedByUserId_idx" ON "impact_data_export_logs"("requestedByUserId");
CREATE INDEX "impact_data_export_logs_createdAt_idx" ON "impact_data_export_logs"("createdAt");

ALTER TABLE "impact_data_export_logs" ADD CONSTRAINT "impact_data_export_logs_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
