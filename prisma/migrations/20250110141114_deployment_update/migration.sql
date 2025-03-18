-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "destroy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentDeploymentId" TEXT;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_parentDeploymentId_fkey" FOREIGN KEY ("parentDeploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
