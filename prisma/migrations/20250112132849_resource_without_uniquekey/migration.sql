/*
  Warnings:

  - You are about to drop the column `uniqueKey` on the `Resource` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Resource_uniqueKey_key";

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "uniqueKey";
