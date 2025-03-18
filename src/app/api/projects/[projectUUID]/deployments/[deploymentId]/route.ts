import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import prisma from '@/lib/prisma';
import { getDeployment } from './function';

export const DELETE = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    const deploymentId = getParam(context, 'deploymentId', true);
    return withAPIHandler(withAuthAndRBAC(async (_,context) => {
        const user = getUserFromContext(context);
        if (!user) {
            throw ApiError.unauthorized('User not found');
        }
        const resourceDependency = await ProjectManagement.getProject(projectUUID).deploymentInstance.deleteDeployment(deploymentId, user.id);
        if (resourceDependency.status === "ok") {
            return Response.json({ status: "ok", message: 'Deployment Deleted successfully' });
        }
        else {
            return Response.json({ status: "ok", message: 'Deployment Deleted successfully', resourceDependency });
        }
    }, [PermissionTypes.ProjectResourceDelete], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}

export const POST = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    const deploymentId = getParam(context, 'deploymentId', true);
    return withAPIHandler(withAuthAndRBAC(async () => {
        const startedDeploymentId = await ProjectManagement.getProject(projectUUID).deploymentInstance.startDeployment(deploymentId);
        return Response.json(startedDeploymentId);
    }, [PermissionTypes.ProjectResourceCreate], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}

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

                const deployment = await getDeployment(deploymentId);

                return Response.json(deployment);
            },
            [PermissionTypes.ProjectResourceRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}