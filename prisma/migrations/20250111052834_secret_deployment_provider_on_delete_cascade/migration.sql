-- AlterTable
ALTER TABLE "Secret" ADD COLUMN     "deploymentId" TEXT,
ADD COLUMN     "providerId" TEXT;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
