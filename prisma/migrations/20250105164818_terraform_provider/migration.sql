/*
  Warnings:

  - The `providerId` column on the `ACL` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Provider` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Provider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `providerId` on the `ProjectProvider` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ACL" DROP CONSTRAINT "ACL_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectProvider" DROP CONSTRAINT "ProjectProvider_providerId_fkey";

-- AlterTable
ALTER TABLE "ACL" DROP COLUMN "providerId",
ADD COLUMN     "providerId" INTEGER;

-- AlterTable
ALTER TABLE "ProjectProvider" DROP COLUMN "providerId",
ADD COLUMN     "providerId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Provider" DROP CONSTRAINT "Provider_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Provider_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "TerraformProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerraformProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TerraformProvider_name_key" ON "TerraformProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProvider_projectId_providerId_key" ON "ProjectProvider"("projectId", "providerId");

-- AddForeignKey
ALTER TABLE "ACL" ADD CONSTRAINT "ACL_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProvider" ADD CONSTRAINT "ProjectProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
