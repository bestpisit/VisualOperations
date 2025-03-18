import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes, RoleTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';

/**
 * GET: Fetch users in a project who have the "ProjectRead" permission.
 */
export async function GET(request: Request, context: any) {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async () => {
                try {
                    const project = await prisma.project.findUnique({
                        where: { uuid: projectUUID },
                        include: {
                            ACLs: {
                                where: { userId: { not: null } },
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            email: true,
                                        },
                                    },
                                    Role: {
                                        select: {
                                            name: true,
                                            RolePermissions: {
                                                include: {
                                                    permission: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    });

                    if (!project) {
                        throw ApiError.notFound('Project not found');
                    }

                    const projectReadUsers = project.ACLs
                        .filter((acl) =>
                            acl.Role.RolePermissions.some(
                                (rolePermission) =>
                                    rolePermission.permission.name === PermissionTypes.ProjectRead
                            )
                        )
                        .map((acl) => {
                            if (!acl.user) return null;
                            return {
                                id: acl.user.id,
                                name: acl.user.name,
                                email: acl.user.email,
                                role: { name: acl.Role.name },
                            };
                        })
                        .filter((user) => user !== null);

                    return Response.json(projectReadUsers);
                } catch (e: any) {
                    throw ApiError.internalServerError(e.message);
                }
            },
            [PermissionTypes.ProjectRead],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}

/**
 * POST: Add a user to a project with a specific role.
 */
export const POST = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const { email, role } = await req.json();
    
                if (!projectUUID) {
                    throw ApiError.badRequest('Project name is required.');
                }
                if (!email || !role) {
                    throw ApiError.badRequest('Email and role are required.');
                }
    
                // Restricted roles
                const availableRoles = [RoleTypes.ProjectContributor, RoleTypes.ProjectViewer];
                if (!availableRoles.includes(role)) {
                    throw ApiError.badRequest(
                        `Invalid role: ${role}. Must be one of: ${availableRoles.join(', ')}`
                    );
                }
    
                // Find the user
                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true },
                });
                if (!user) {
                    throw ApiError.notFound(`User with email "${email}" not found.`);
                }
    
                // Find the project
                const selectedProject = await prisma.project.findUnique({
                    where: { uuid: projectUUID },
                    select: { id: true },
                });
                if (!selectedProject) {
                    throw ApiError.notFound(`Project "${projectUUID}" not found.`);
                }
    
                // Check if the user already has access
                const existingACL = await prisma.aCL.findFirst({
                    where: {
                        userId: user.id,
                        projectId: selectedProject.id,
                    },
                });
                if (existingACL) {
                    throw ApiError.badRequest('User already has access to this project.');
                }
    
                // Find the specified role
                const newRole = await prisma.role.findUnique({
                    where: { name: role },
                });
                if (!newRole) {
                    throw ApiError.badRequest(`Role "${role}" not found.`);
                }
    
                // Create an ACL entry
                await prisma.aCL.create({
                    data: {
                        userId: user.id,
                        projectId: selectedProject.id,
                        roleId: newRole.id,
                    },
                });
    
                return Response.json(
                    { message: 'User added successfully to the project.' },
                    { status: 201 }
                );
            },
            [PermissionTypes.ProjectAccessControl],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);    
}
/**
 * PUT: Update multiple users' roles within a project.
 */
export const PUT = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const { members: users } = await req.json();
    
                // Admin user info
                const adminUserId = getUserFromContext(context).id;
                const adminRoleName = getUserFromContext(context).role;
    
                if (!adminRoleName) {
                    throw ApiError.unauthorized('Unauthorized');
                }
                if (!users || !Array.isArray(users)) {
                    throw ApiError.badRequest('Invalid request body.');
                }
    
                // Restricted roles
                const availableRoles = [RoleTypes.ProjectContributor, RoleTypes.ProjectViewer];
    
                // Check if the project exists
                const selectedProject = await prisma.project.findUnique({
                    where: { uuid: projectUUID },
                });
                if (!selectedProject) {
                    throw ApiError.notFound(`Project "${projectUUID}" not found.`);
                }
    
                // Prepare valid updates
                const validUpdates: Array<{ aclId: string; roleId: number }> = [];
    
                for (const userObj of users) {
                    const { userId, newRole } = userObj;
    
                    if (!userId || !newRole) {
                        throw ApiError.badRequest('Missing userId or newRole.');
                    }
                    if (!availableRoles.includes(newRole)) {
                        throw ApiError.badRequest(
                            `Invalid role: ${newRole}. Must be one of: ${availableRoles.join(', ')}`
                        );
                    }
                    // Prevent self-role change
                    if (adminUserId === userId) {
                        throw ApiError.badRequest('You cannot change your own role.');
                    }
    
                    // Find the target user in the ACL
                    const targetUser = await prisma.aCL.findFirst({
                        where: {
                            userId,
                            projectId: selectedProject.id,
                        },
                        include: {
                            Role: { select: { name: true } },
                            user: true,
                        },
                    });
    
                    if (!targetUser) {
                        throw ApiError.notFound(
                            `User with ID "${userId}" not found within this project.`
                        );
                    }
    
                    // Prevent modifying a ProjectOwner
                    if (targetUser.Role.name === RoleTypes.ProjectOwner) {
                        throw ApiError.badRequest(`Cannot modify the role of a 'ProjectOwner'.`);
                    }
    
                    // Find the new role entity
                    const newRoleEntity = await prisma.role.findUnique({
                        where: { name: newRole },
                    });
                    if (!newRoleEntity) {
                        throw ApiError.badRequest(`Role "${newRole}" not found.`);
                    }
    
                    validUpdates.push({
                        aclId: targetUser.id,
                        roleId: newRoleEntity.id,
                    });
                }
    
                // Perform updates in a transaction
                await prisma.$transaction(
                    validUpdates.map((update) =>
                        prisma.aCL.update({
                            where: { id: update.aclId },
                            data: { roleId: update.roleId },
                        })
                    )
                );
    
                return Response.json({ message: 'Project roles updated successfully.' });
            },
            [PermissionTypes.ProjectAccessControl],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}

/**
 * DELETE: Remove a user from a project (except the project owner).
 */
export const DELETE = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const { email } = await req.json();
    
                if (!email) {
                    throw ApiError.badRequest('Email is required.');
                }
    
                // Find the user by email
                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true },
                });
                if (!user) {
                    throw ApiError.notFound(`User with email "${email}" not found.`);
                }
    
                // Find the project
                const selectedProject = await prisma.project.findUnique({
                    where: { uuid: projectUUID },
                });
                if (!selectedProject) {
                    throw ApiError.notFound(`Project "${projectUUID}" not found.`);
                }
    
                // Check if the user is in the project's ACL
                const existingACL = await prisma.aCL.findFirst({
                    where: {
                        userId: user.id,
                        projectId: selectedProject.id,
                    },
                    select: { id: true, Role: { select: { name: true } } },
                });
                if (existingACL) {
                    if (existingACL.Role.name === RoleTypes.ProjectOwner) {
                        throw ApiError.badRequest('Cannot remove the owner of the project.');
                    }
    
                    await prisma.aCL.delete({
                        where: { id: existingACL.id },
                    });
                    return Response.json({
                        message: 'User removed successfully from the project.',
                    });
                }
    
                throw ApiError.badRequest('User does not have access to this project.');
            },
            [PermissionTypes.ProjectAccessControl],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);    
}