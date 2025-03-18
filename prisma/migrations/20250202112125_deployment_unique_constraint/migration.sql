-- AlterTable
ALTER TABLE "UniqueConstraint" ADD COLUMN     "deploymentId" TEXT;

-- AddForeignKey
ALTER TABLE "UniqueConstraint" ADD CONSTRAINT "UniqueConstraint_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
