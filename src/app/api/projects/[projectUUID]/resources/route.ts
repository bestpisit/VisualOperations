import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, mapResourceForRBAC } from '@/lib/utils';
import { getSearchParams } from '@/lib/api_utils';
import { DeploymentTemplate } from '@/types/PlatformStructure';

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
                const templateId = searchParams.get('templateId');

                const resources = await prisma.resource.findMany({
                    where: {
                        deployment: {
                            project: {
                                uuid: projectUUID,
                            }
                        }
                    },
                    select: {
                        uuid: true,
                        name: true,
                        type: true,
                        deployment: {
                            select: {
                                id: true,
                                ...(templateId === "true" ? {
                                    templateId: true
                                } : {}),
                                template: {
                                    select: {
                                        name: true,
                                        details: true
                                    }
                                },
                                provider: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        },
                        createdAt: true,
                        updatedAt: true,
                        details: true,
                        tags: true
                    }
                });

                const extractedResources = resources.map(resource => {
                    const templateDetails = resource.deployment.template.details as unknown as DeploymentTemplate;
                    return {
                        uuid: resource.uuid,
                        name: resource.name,
                        type: resource.type,
                        deployment: {
                            id: resource.deployment.id,
                            template: {
                                name: resource.deployment.template.name,
                            },
                            ...(templateId === "true" ? {
                                templateId: resource.deployment.templateId
                            } : {})
                        },
                        createdAt: resource.createdAt,
                        updatedAt: resource.updatedAt,
                        tags: resource.tags,
                        imageKey: templateDetails?.imageKey,
                        status: (resource.details as any)?.status?.value,
                        providerName: resource.deployment?.provider?.name
                    }
                });

                return Response.json(extractedResources);
            },
            [PermissionTypes.ProjectResourceRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}