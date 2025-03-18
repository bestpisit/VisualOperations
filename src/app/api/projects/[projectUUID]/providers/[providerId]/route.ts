import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import { ApiError } from '@/types/api/apiError';
import { getParam } from '@/lib/utils';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
import { DeploymentType } from '@/types/PlatformStructure';

export const DELETE = withAPIHandler(withAuthAndAdmin(async (_, context) => {
    const projectUUID = getParam<string>(context, 'projectUUID');

    if (!projectUUID) {
        throw ApiError.badRequest('Project UUID is required');
    }

    const providerId = getParam<string>(context, 'providerId');

    if (!providerId) {
        throw ApiError.badRequest('Provider ID is required');
    }

    const project = await prisma.project.findUnique({
        where: {
            uuid: projectUUID,
        },
    });

    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    const provider = await prisma.provider.findUnique({
        where: {
            id: parseInt(providerId),
        },
    });

    if (!provider) {
        throw ApiError.notFound('Provider not found');
    }

    if (!!provider.resourceId) {
        throw ApiError.badRequest('Resource Provider is in use and cannot be deleted');
    }

    const projectProvider = await prisma.projectProvider.delete({
        where: {
            projectId_providerId: {
                projectId: project.id,
                providerId: provider.id,
            }
        }
    });

    const deployments = await prisma.deployment.findMany({
        where: {
            projectId: project.uuid,
            providerId: provider.uuid
        }
    });

    //get deployment.type from deployment that use this provider
    for (const deployment of deployments) {
        await ProjectManagement.getProject(projectUUID).terraformInstance.generateProviderFile(deployment.type as DeploymentType);
    }

    return Response.json(projectProvider);
}));