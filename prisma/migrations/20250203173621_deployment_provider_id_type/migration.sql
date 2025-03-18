-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'undefined';

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
