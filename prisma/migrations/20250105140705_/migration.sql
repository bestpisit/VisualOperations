/*
  Warnings:

  - You are about to drop the column `projectId` on the `ProjectTemplate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectUUID,templateId]` on the table `ProjectTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectUUID` to the `ProjectTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProjectTemplate" DROP CONSTRAINT "ProjectTemplate_projectId_fkey";

-- DropIndex
DROP INDEX "ProjectTemplate_projectId_templateId_key";

-- AlterTable
ALTER TABLE "ProjectTemplate" DROP COLUMN "projectId",
ADD COLUMN     "projectUUID" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplate_projectUUID_templateId_key" ON "ProjectTemplate"("projectUUID", "templateId");

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_projectUUID_fkey" FOREIGN KEY ("projectUUID") REFERENCES "Project"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
