/*
  Warnings:

  - You are about to drop the column `deploymentId` on the `UniqueConstraint` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UniqueConstraint" DROP CONSTRAINT "UniqueConstraint_deploymentId_fkey";

-- AlterTable
ALTER TABLE "UniqueConstraint" DROP COLUMN "deploymentId",
ADD COLUMN     "resourceId" TEXT;

-- AddForeignKey
ALTER TABLE "UniqueConstraint" ADD CONSTRAINT "UniqueConstraint_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
