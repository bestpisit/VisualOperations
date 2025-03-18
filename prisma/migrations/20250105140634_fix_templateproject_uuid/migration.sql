-- DropForeignKey
ALTER TABLE "ProjectTemplate" DROP CONSTRAINT "ProjectTemplate_projectId_fkey";

-- AlterTable
ALTER TABLE "ProjectTemplate" ALTER COLUMN "projectId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
