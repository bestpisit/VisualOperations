/*
  Warnings:

  - You are about to drop the column `projectId` on the `Resource` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uniqueKey]` on the table `Resource` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deploymentId` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uniqueKey` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProjectProvider" DROP CONSTRAINT "ProjectProvider_providerId_fkey";

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_projectId_fkey";

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "projectId",
ADD COLUMN     "deploymentId" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "uniqueKey" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Resource_uniqueKey_key" ON "Resource"("uniqueKey");

-- AddForeignKey
ALTER TABLE "ProjectProvider" ADD CONSTRAINT "ProjectProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
