import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndAdmin, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, mapResourceForRBAC } from '@/lib/utils';
import { getSearchParams } from '@/lib/api_utils';

export const GET = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const project = await prisma.project.findUnique({
                    where: {
                        uuid: projectUUID,
                    },
                });
                if (!project) {
                    throw ApiError.notFound('Project not found');
                }
    
                const searchParams = getSearchParams(req);
                const terraformProviderId = searchParams.get('terraformProviderId');
                const terraformProviderIds = searchParams.getAll('terraformProviderIds');
    
                const providers = await prisma.provider.findMany({
                    where: {
                        ProjectProvider: {
                            some: {
                                projectId: project.id,
                            },
                        },
                        ...(terraformProviderId ? {terraformProviderId} : {}),
                        ...(terraformProviderIds.length > 0 ? {terraformProviderId: {in: terraformProviderIds}} : {}),
                    },
                    select: {
                        id: true,
                        uuid: true,
                        name: true,
                        description: true,
                        terraformProviderId: true,
                    }
                });
                return Response.json(providers);
            },
            [PermissionTypes.ProjectProviderRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}

export const POST = withAPIHandler(withAuthAndAdmin(async (req, context) => {
    const projectUUID = getParam<string>(context, 'projectUUID');

    if (!projectUUID) {
        throw ApiError.badRequest('Project UUID is required');
    }

    const {providerId} = await req.json();

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
            id: providerId,
        },
    });

    if (!provider) {
        throw ApiError.notFound('Provider not found');
    }

    const projectProvider = await prisma.projectProvider.create({
        data: {
            projectId: project.id,
            providerId: provider.id,
        }
    });

    // await ProjectManagement.getProject(projectUUID).terraformInstance.generateProviderFile();

    return Response.json(projectProvider);
}));