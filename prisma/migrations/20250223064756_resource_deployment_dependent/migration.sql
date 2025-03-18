-- DropForeignKey
ALTER TABLE "ResourceDependency" DROP CONSTRAINT "ResourceDependency_dependencyId_fkey";

-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "resourceDependentId" TEXT;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_resourceDependentId_fkey" FOREIGN KEY ("resourceDependentId") REFERENCES "Resource"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDependency" ADD CONSTRAINT "ResourceDependency_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "Resource"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
