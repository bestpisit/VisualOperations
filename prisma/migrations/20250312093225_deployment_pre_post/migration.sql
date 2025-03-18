-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "postDeploymentState" JSONB,
ADD COLUMN     "preDeploymentState" JSONB;
