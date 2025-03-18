-- CreateTable
CREATE TABLE "TemplateProvider" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateProvider_templateId_providerId_key" ON "TemplateProvider"("templateId", "providerId");

-- AddForeignKey
ALTER TABLE "TemplateProvider" ADD CONSTRAINT "TemplateProvider_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProvider" ADD CONSTRAINT "TemplateProvider_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TerraformProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
