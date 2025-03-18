import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
import { DeploymentConfiguration, DeploymentTemplate } from '@/types/PlatformStructure';
import { deploymentConfigurationSchema, deploymentTemplateSchema, validateWithSchema } from '@/types/schemas/zod';

export interface CustomDeployments {
    user: {
        id: string;
        email: string;
    } | null;
    template: {
        name: string;
    };
    id: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    destroy: boolean;
    active: boolean;
    parentDeploymentId: string | null;
    resourceName: string;
}

export const GET = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async () => {
                const project = await prisma.project.findUnique({
                    where: {
                        uuid: projectUUID,
                    },
                });
                if (!project) {
                    throw ApiError.notFound('Project not found');
                }

                const deployments = await prisma.deployment.findMany(
                    {
                        where: {
                            projectId: project.uuid,
                        },
                        select: {
                            id: true,
                            name: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                }
                            },
                            template: {
                                select: {
                                    name: true,
                                    details: true,
                                }
                            },
                            status: true,
                            destroy: true,
                            config: true,
                            active: true,
                            createdAt: true,
                            updatedAt: true,
                            parentDeploymentId: true
                        },
                        orderBy: {
                            createdAt: 'desc',
                        }
                    }
                )

                const customDeployments = deployments.map(({ config, template, ...rest }) => {
                    validateWithSchema(deploymentConfigurationSchema, config);
                    const newConfig = config as DeploymentConfiguration;
                    const templateDetails = template.details as unknown as DeploymentTemplate;
                    validateWithSchema(deploymentTemplateSchema, templateDetails);
                    const resourceConfigKey = templateDetails.resources?.[0]?.name?.from;
                    if (!resourceConfigKey) {
                        throw ApiError.internalServerError('Resource config key not found');
                    }
                    const newDeployment = {
                        ...rest,
                        resourceName: newConfig[resourceConfigKey].value,
                        template: {
                            name: template.name
                        }
                    };
                    return newDeployment;
                });

                return Response.json(customDeployments);
            },
            [PermissionTypes.ProjectResourceRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}

export const POST = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(withAuthAndRBAC(async (req) => {

        if (!projectUUID) {
            throw ApiError.badRequest('Project UUID is required');
        }

        const { templateId, config, name } = await req.json();

        if (!templateId || !config) {
            throw ApiError.badRequest('Template ID & Config is required');
        }

        const user = getUserFromContext(context);

        const deploymentId = await ProjectManagement.getProject(projectUUID).deploymentInstance.createDeployment(config, templateId, user.id, name);

        return Response.json({ message: 'Deployment create successfully', deploymentId });
    }, [PermissionTypes.ProjectResourceCreate], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}