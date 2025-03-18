-- DropForeignKey
ALTER TABLE "ProjectProvider" DROP CONSTRAINT "ProjectProvider_providerId_fkey";

-- AddForeignKey
ALTER TABLE "ProjectProvider" ADD CONSTRAINT "ProjectProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
