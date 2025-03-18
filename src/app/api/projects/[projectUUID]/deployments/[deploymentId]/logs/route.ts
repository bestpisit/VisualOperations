import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { getParam, mapResourceForRBAC } from '@/lib/utils';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import prisma from '@/lib/prisma';

export const GET = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    const deploymentId = getParam(context, 'deploymentId', true);
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

                const deployment = await prisma.deployment.findUnique({
                    where: {
                        id: deploymentId
                    },
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        logs: true,
                        postDeploymentState: true,
                    },
                });

                if (!deployment) {
                    throw ApiError.notFound('Deployment not found');
                }

                return Response.json({
                    status: deployment.status,
                    logs: deployment.logs,
                    postDeploymentState: deployment.postDeploymentState,
                });
            },
            [PermissionTypes.ProjectResourceRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}