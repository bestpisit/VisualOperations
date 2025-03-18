import { ProjectManagement } from "@/lib/core/project/ProjectManagement";
import { withAPIHandler, withAuthAndRBAC } from "@/lib/middleware/apiWithMiddleware";
import prisma from "@/lib/prisma";
import { getParam, getUserFromContext, mapResourceForRBAC } from "@/lib/utils";
import { ApiError } from "@/types/api/apiError";
import { PermissionTypes } from "@/types/prisma/RBACTypes";

export const DELETE = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    const resourceUUID = getParam(context, 'resourceUUID', true);
    return withAPIHandler(withAuthAndRBAC(async (_,context) => {
        const { force } = await request.json();
        const user = getUserFromContext(context);
        if (!user) {
            throw ApiError.unauthorized('User not found');
        }
        const resource = await prisma.resource.findUnique({
            where: {
                uuid: resourceUUID
            }
        });
        if (!resource) {
            throw ApiError.notFound('Resource not found');
        }
        const result = await ProjectManagement.getProject(projectUUID).deploymentInstance.deleteDeployment(resource.deploymentId, user.id, !!force);
        if (result.status === "ok") {
            return Response.json({ status: "ok", message: 'Deployment Deleted successfully' });
        }
        else {
            return Response.json({ status: "failed", message: 'Deployment Deleted successfully', resourceDependency: result.resourceDependency });
        }
    }, [PermissionTypes.ProjectResourceDelete], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}