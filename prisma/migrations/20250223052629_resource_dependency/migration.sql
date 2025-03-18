-- CreateTable
CREATE TABLE "ResourceDependency" (
    "id" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "dependencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceDependency_dependentId_dependencyId_key" ON "ResourceDependency"("dependentId", "dependencyId");

-- AddForeignKey
ALTER TABLE "ResourceDependency" ADD CONSTRAINT "ResourceDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Resource"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDependency" ADD CONSTRAINT "ResourceDependency_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "Resource"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
