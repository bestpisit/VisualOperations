-- DropForeignKey
ALTER TABLE "ProjectResourceQuota" DROP CONSTRAINT "ProjectResourceQuota_projectId_fkey";

-- AlterTable
ALTER TABLE "ProjectResourceQuota" ALTER COLUMN "projectId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "ProjectResourceQuota" ADD CONSTRAINT "ProjectResourceQuota_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
