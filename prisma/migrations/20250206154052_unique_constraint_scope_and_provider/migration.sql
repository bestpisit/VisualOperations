/*
  Warnings:

  - A unique constraint covering the columns `[key,value,scope]` on the table `UniqueConstraint` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UniqueConstraint_key_value_key";

-- AlterTable
ALTER TABLE "UniqueConstraint" ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'global';

-- CreateIndex
CREATE UNIQUE INDEX "UniqueConstraint_key_value_scope_key" ON "UniqueConstraint"("key", "value", "scope");

-- AddForeignKey
ALTER TABLE "UniqueConstraint" ADD CONSTRAINT "UniqueConstraint_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
