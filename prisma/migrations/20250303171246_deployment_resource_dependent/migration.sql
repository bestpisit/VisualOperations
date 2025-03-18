/*
  Warnings:

  - You are about to drop the column `resourceDependentId` on the `Deployment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_resourceDependentId_fkey";

-- AlterTable
ALTER TABLE "Deployment" DROP COLUMN "resourceDependentId";

-- CreateTable
CREATE TABLE "_DeploymentResourceDependent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DeploymentResourceDependent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DeploymentResourceDependent_B_index" ON "_DeploymentResourceDependent"("B");

-- AddForeignKey
ALTER TABLE "_DeploymentResourceDependent" ADD CONSTRAINT "_DeploymentResourceDependent_A_fkey" FOREIGN KEY ("A") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeploymentResourceDependent" ADD CONSTRAINT "_DeploymentResourceDependent_B_fkey" FOREIGN KEY ("B") REFERENCES "Resource"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
