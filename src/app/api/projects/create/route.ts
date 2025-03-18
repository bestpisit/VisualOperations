import prisma from '@/lib/prisma';
import { withAPIHandler, withAuth } from '@/lib/middleware/apiWithMiddleware';
import { Project, User } from '@prisma/client';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getSessionFromContext } from '@/lib/utils';
import { generateUUIDFromName } from '@/lib/utility/uuidManager';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';

export const POST = withAPIHandler(withAuth(async (req, context) => {
    const projectData = await req.json();
    const session = getSessionFromContext(context);
    const project = await createProject(session.user.id, projectData as Project);
    return Response.json(project);
}));

async function createProject(userId: User['id'], data: Project) {
    try {
        const projectName = data.name;
        // Start a transaction
        const result = await prisma.$transaction(async (prisma) => {
            const sanitized = projectName
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/^-+|-+$/g, '');

            const existingProject = await prisma.project.findFirst({
                where: { uuid: sanitized },
            });
            let projectUUID = sanitized;
            if(existingProject) {
                projectUUID += '-'+generateUUIDFromName(projectName);
            }
            // Step 1: Create the project
            const newProject = await prisma.project.create({
                data: {
                    name: data.name,
                    uuid: projectUUID,
                    description: data.description || null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ownerId: userId,
                },
            });

            ProjectManagement.getProject(projectUUID).folderInstance.createProjectFolder();

            // Step 2: Find the role ID for 'OWNER'
            const ownerRole = await prisma.role.findUnique({
                where: { name: RoleTypes.ProjectOwner }, // Adjust this query as per your Role model
            });

            if (!ownerRole) {
                throw ApiError.internalServerError("Role 'OWNER' not found");
            }

            // Step 3: Create an ACL entry for the user with the roleId
            await prisma.aCL.create({
                data: {
                    userId: userId,
                    projectId: newProject.id,
                    roleId: ownerRole.id, // Use roleId here instead of directly connecting role
                },
            });

            // Return the newly created project
            return newProject;
        });

        return result; // Transaction succeeded
    } catch (error: any) {
        // Handle Prisma P2002 (Unique Constraint Violation)
        if (error.code === 'P2002' && (error.meta?.target?.includes('uuid') || error.meta?.target?.includes('name'))) {
            throw ApiError.badRequest("A project with this name already exists. Please choose a different name.");
        }
        console.error("Error creating project with transaction:", error);
        throw ApiError.internalServerError("Failed to create project");
    }
}