-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "resourceId" TEXT;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
