/*
  Warnings:

  - You are about to drop the column `type` on the `Provider` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Provider" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "TerraformProvider" ADD COLUMN     "type" TEXT;
