import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { getParam, mapResourceForRBAC } from '@/lib/utils';
import { DeploymentTemplate } from '@/types/PlatformStructure';

export const GET = async (request: Request, context: any) => {
    const resourceId = getParam(context, 'resourceId', true);
    const resource = await prisma.resource.findUnique({
        where: {
            uuid: resourceId,
        },
        include: {
            deployment: {
                select: {
                    id: true,
                    project: {
                        select: {
                            uuid: true,
                        }
                    },
                    template: {
                        select: {
                            name: true,
                            details: true,
                        }
                    }
                }
            }
        }
    });
    if (!resource) {
        return Response.json({ error: 'Resource not found' }, { status: 404 });
    }
    return withAPIHandler(
        withAuthAndRBAC(
            async () => {
                // const resourceInformation = await getResourceInformation(resource);
                const templateDetails = resource.deployment.template.details as unknown as DeploymentTemplate;
                const extractedResources = {
                    uuid: resource.uuid,
                    name: resource.name,
                    type: resource.type,
                    details: resource.details,
                    deployment: {
                        id: resource.deployment.id,
                        template: {
                            name: resource.deployment.template.name,
                        }
                    },
                    createdAt: resource.createdAt,
                    updatedAt: resource.updatedAt,
                    tags: resource.tags,
                    imageKey: templateDetails?.imageKey,
                    status: (resource.details as any)?.status?.value,
                }

                return Response.json(extractedResources);
            },
            [PermissionTypes.ProjectResourceRead],
            mapResourceForRBAC(resource.deployment.project.uuid, 'Project', true)
        )
    )(request, context);
}