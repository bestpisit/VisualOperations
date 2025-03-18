import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';

export const POST = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    const deploymentId = getParam(context, 'deploymentId', true);
    return withAPIHandler(withAuthAndRBAC(async (_,context) => {
        const user = getUserFromContext(context);
        if (!user) {
            throw ApiError.unauthorized('User not found');
        }
        await ProjectManagement.getProject(projectUUID).deploymentInstance.undoDeleteDeployment(deploymentId, user.id);
        return Response.json({ message: 'Deployment Deleted successfully' });
    }, [PermissionTypes.ProjectResourceDelete], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}