-- DropForeignKey
ALTER TABLE "ResourceDependency" DROP CONSTRAINT "ResourceDependency_dependencyId_fkey";

-- DropForeignKey
ALTER TABLE "ResourceDependency" DROP CONSTRAINT "ResourceDependency_dependentId_fkey";

-- AddForeignKey
ALTER TABLE "ResourceDependency" ADD CONSTRAINT "ResourceDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Resource"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDependency" ADD CONSTRAINT "ResourceDependency_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "Resource"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
