/*
  Warnings:

  - The primary key for the `Deployment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `actionUser` on the `Deployment` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Deployment` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `Deployment` table. All the data in the column will be lost.
  - You are about to drop the column `versionTag` on the `Deployment` table. All the data in the column will be lost.
  - The primary key for the `Resource` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `config` to the `Deployment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `logs` to the `Deployment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `Deployment` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `Deployment` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Resource` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_projectId_fkey";

-- AlterTable
ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_pkey",
DROP COLUMN "actionUser",
DROP COLUMN "id",
DROP COLUMN "progress",
DROP COLUMN "versionTag",
ADD COLUMN     "config" JSONB NOT NULL,
ADD COLUMN     "logs" JSONB NOT NULL,
ADD COLUMN     "templateId" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "Deployment_pkey" PRIMARY KEY ("uuid");

-- AlterTable
ALTER TABLE "Resource" DROP CONSTRAINT "Resource_pkey",
DROP COLUMN "id",
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD CONSTRAINT "Resource_pkey" PRIMARY KEY ("uuid");

-- CreateIndex
CREATE INDEX "Deployment_projectId_templateId_idx" ON "Deployment"("projectId", "templateId");

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
