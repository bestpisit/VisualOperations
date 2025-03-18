import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';
import getProject from './function';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';

export const GET = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (_, context) => {
                const project = await getProject(projectUUID as string, getUserFromContext(context).id);
                return Response.json(project);
            },
            [PermissionTypes.ProjectRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}

export const POST = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(withAuthAndRBAC(async () => {
        return Response.json("create a resource project" + projectUUID);
    }, [PermissionTypes.ProjectResourceCreate], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}

export const PUT = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(withAuthAndRBAC(async (req, context) => {
        const { name, description } = await req.json();
        const projectUUID = getParam(context, 'projectUUID', true);
        if (!name || !description) {
            throw ApiError.badRequest('Both name and description are required.');
        }
        const updatedProject = await prisma.project.update({
            where: { uuid: projectUUID as string },
            data: {
                name: name,
                description: description,
            },
        });
        return Response.json({
            message: `Project ${updatedProject.name} updated successfully`,
            updatedProject,
        });
    }, [PermissionTypes.ProjectUpdate], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
}

export const DELETE = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(withAuthAndRBAC(async () => {
        if (!projectUUID) {
            throw ApiError.badRequest('Project UUID is required');
        }
        await ProjectManagement.removeProject(projectUUID as string);
        await prisma.deployment.deleteMany({ where: { projectId: projectUUID as string } });
        const deleteProject = await prisma.project.delete({
            where: { uuid: projectUUID as string },
            select: { name: true },
        });
        ProjectManagement.getProject(projectUUID).folderInstance.deleteProjectFolder();
        return Response.json({ message: `Project ${deleteProject.name} deleted successfully` });
    }, [PermissionTypes.ProjectDelete], mapResourceForRBAC(projectUUID, 'Project', true)))(request, context);
} 