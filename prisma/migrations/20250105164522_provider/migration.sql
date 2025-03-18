/*
  Warnings:

  - The primary key for the `Provider` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "ACL" DROP CONSTRAINT "ACL_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectProvider" DROP CONSTRAINT "ProjectProvider_providerId_fkey";

-- AlterTable
ALTER TABLE "ACL" ALTER COLUMN "providerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ProjectProvider" ALTER COLUMN "providerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Provider" DROP CONSTRAINT "Provider_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Provider_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Provider_id_seq";

-- AddForeignKey
ALTER TABLE "ACL" ADD CONSTRAINT "ACL_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProvider" ADD CONSTRAINT "ProjectProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
