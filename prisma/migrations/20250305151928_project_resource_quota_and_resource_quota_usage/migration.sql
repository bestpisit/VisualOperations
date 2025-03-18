/*
  Warnings:

  - You are about to drop the `ResourceQuota` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ResourceQuota" DROP CONSTRAINT "ResourceQuota_projectId_fkey";

-- DropTable
DROP TABLE "ResourceQuota";

-- CreateTable
CREATE TABLE "ProjectResourceQuota" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "quotas" JSONB NOT NULL,
    "usage" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectResourceQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceQuotaUsage" (
    "id" SERIAL NOT NULL,
    "resourceId" TEXT NOT NULL,
    "usage" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceQuotaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectResourceQuota_projectId_key" ON "ProjectResourceQuota"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceQuotaUsage_resourceId_key" ON "ResourceQuotaUsage"("resourceId");

-- AddForeignKey
ALTER TABLE "ProjectResourceQuota" ADD CONSTRAINT "ProjectResourceQuota_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceQuotaUsage" ADD CONSTRAINT "ResourceQuotaUsage_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
