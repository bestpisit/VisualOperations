import { withAPIHandler, withAuthAndRBAC } from "@/lib/middleware/apiWithMiddleware";
import prisma from "@/lib/prisma";
import { getParam, mapResourceForRBAC } from "@/lib/utils";
import { ApiError } from "@/types/api/apiError";
import { PermissionTypes } from "@/types/prisma/RBACTypes";

export interface RefreshStatusResponse {
    isRefreshing: boolean;
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

                return Response.json({ isRefreshing: project.isRefreshing });
            },
            [PermissionTypes.ProjectResourceUpdate],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}

//refresh resources
export const POST = (request: Request, context: any) => {
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

                // const updatedProject = await prisma.project.updateMany({
                //     where: {
                //         uuid: projectUUID,
                //         isRefreshing: false
                //     },
                //     data: {
                //         isRefreshing: true
                //     }
                // });

                // if (updatedProject.count === 0) {
                //     return Response.json({ isRefreshing: project.isRefreshing });
                // }

                // await deploymentQueueManager.enqueue(projectUUID, null, DeploymentQueueType.Refresh);

                return Response.json({ isRefreshing: false });
            },
            [PermissionTypes.ProjectResourceUpdate],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}