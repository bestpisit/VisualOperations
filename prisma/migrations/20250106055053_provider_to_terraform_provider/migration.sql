/*
  Warnings:

  - Added the required column `terraformProviderId` to the `Provider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "terraformProviderId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_terraformProviderId_fkey" FOREIGN KEY ("terraformProviderId") REFERENCES "TerraformProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
