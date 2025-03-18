-- CreateTable
CREATE TABLE "UniqueConstraint" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deploymentId" TEXT NOT NULL,

    CONSTRAINT "UniqueConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UniqueConstraint_key_value_key" ON "UniqueConstraint"("key", "value");

-- AddForeignKey
ALTER TABLE "UniqueConstraint" ADD CONSTRAINT "UniqueConstraint_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
