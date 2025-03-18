import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes, RoleTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';

/**
 * GET: Fetch users in a provider who have the "ProviderRead" permission.
 */
export const GET = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async () => {
                // Find the provider by its ID and get related ACLs for users
                const provider = await prisma.provider.findUnique({
                    where: { name: providerName as string },
                    include: {
                        ACLs: {
                            where: { userId: { not: null } }, // Only fetch ACLs related to users (ignore groups)
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    }
                                },
                                Role: {
                                    select: {
                                        name: true,
                                        RolePermissions: {
                                            include: {
                                                permission: true // Include permissions for the role
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (!provider) {
                    throw ApiError.notFound('Provider not found');
                }

                // Filter users who have the 'ProviderRead' permission
                const providerReadUsers = provider.ACLs
                    .filter(acl =>
                        acl.Role.RolePermissions.some(
                            rolePermission => rolePermission.permission.name === PermissionTypes.ProviderRead
                        )
                    )
                    .map(acl => {
                        if (!acl.user) {
                            return null;
                        }
                        return {
                            id: acl.user.id,
                            name: acl.user.name,
                            email: acl.user.email,
                            role: { name: acl.Role.name }, // Map role name to the user response
                        };
                    })
                    .filter(user => user !== null);

                return Response.json(providerReadUsers);
            },
            // The original example used ProviderAccessControl for all methods
            [PermissionTypes.ProviderAccessControl],
            mapResourceForRBAC(providerName, 'Provider')
        )
    )(request, context);
}

/**
 * POST: Add a user to a provider with a specific role.
 */
export const POST = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const { email, role } = await req.json(); // Expect email and role

                if (!email || !role) {
                    throw ApiError.badRequest('Email and role are required.');
                }

                const availableRoles = [RoleTypes.ProviderEditor, RoleTypes.ProviderViewer]; // Restricted roles

                if (!availableRoles.includes(role)) {
                    throw ApiError.badRequest(
                        `Invalid role: ${role}. Must be one of: ${availableRoles.join(', ')}`
                    );
                }

                // Find the user by email
                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true }
                });

                if (!user) {
                    throw ApiError.notFound(`User with email "${email}" not found.`);
                }

                const selectedProvider = await prisma.provider.findUnique({
                    where: { name: providerName as string }
                });

                if (!selectedProvider) {
                    throw ApiError.notFound(`Provider "${providerName}" not found.`);
                }

                // Check if the user already has access to the provider
                const existingACL = await prisma.aCL.findFirst({
                    where: {
                        userId: user.id,
                        providerId: selectedProvider.id
                    }
                });

                if (existingACL) {
                    throw ApiError.badRequest('User already has access to this provider.');
                }

                // Find the role in the database
                const newRole = await prisma.role.findUnique({
                    where: { name: role },
                });

                if (!newRole) {
                    throw ApiError.badRequest(`Role "${role}" not found.`);
                }

                // Add the user to the ACL for this provider
                await prisma.aCL.create({
                    data: {
                        userId: user.id,
                        providerId: selectedProvider.id,
                        roleId: newRole.id,
                    }
                });

                return Response.json(
                    { message: 'User added successfully to the provider.' },
                    { status: 201 }
                );
            },
            [PermissionTypes.ProviderAccessControl],
            mapResourceForRBAC(providerName, 'Provider')
        )
    )(request, context);
}

/**
 * PUT: Update multiple users' roles within a provider.
 */
export const PUT = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req, context) => {
                const { users } = await req.json(); // Expect an array of users [{ userId, newRole }, ...]
                const user = getUserFromContext(context); // Get the user making the request
                const adminUserId = user.id; // Get the admin user ID

                // Ensure the user making the request has a role
                if (!user.role?.name) {
                    throw ApiError.unauthorized('Unauthorized');
                }

                const availableRoles = [RoleTypes.ProviderEditor, RoleTypes.ProviderViewer]; // Restricted roles

                if (!users || !Array.isArray(users)) {
                    throw ApiError.badRequest('Invalid request body.');
                }

                // Prepare valid updates for the transaction
                const validUpdates = [];

                const selectedProvider = await prisma.provider.findUnique({
                    where: { name: providerName as string }
                });

                if (!selectedProvider) {
                    throw ApiError.notFound(`Provider "${providerName}" not found.`);
                }

                for (const user of users) {
                    const userId = user.userId;
                    const newRoleName = user.newRole;

                    if (!userId || !newRoleName) {
                        throw ApiError.badRequest('Missing userId or newRole.');
                    }

                    if (!availableRoles.includes(newRoleName)) {
                        throw ApiError.badRequest(
                            `Invalid role: ${newRoleName}. Must be one of: ${availableRoles.join(', ')}`
                        );
                    }

                    if (adminUserId === userId) {
                        throw ApiError.badRequest('You cannot change your own role.');
                    }

                    // Find the target user and their role within this provider
                    const targetUser = await prisma.aCL.findFirst({
                        where: {
                            userId: userId,
                            providerId: selectedProvider.id
                        },
                        include: { Role: { select: { name: true } }, user: true }
                    });

                    if (!targetUser) {
                        throw ApiError.notFound(`User with ID "${userId}" not found within this provider.`);
                    }

                    // Prevent modification of the 'ProviderOwner' role
                    if (targetUser.Role.name === RoleTypes.ProviderOwner) {
                        throw ApiError.badRequest('Cannot modify the role of a ProviderOwner.');
                    }

                    const newRole = await prisma.role.findUnique({
                        where: { name: newRoleName },
                    });

                    if (!newRole) {
                        throw ApiError.badRequest(`Role "${newRoleName}" not found.`);
                    }

                    // Collect valid updates
                    validUpdates.push({
                        aclId: targetUser.id,
                        roleId: newRole.id,
                    });
                }

                // Perform role updates in a transaction for this provider
                await prisma.$transaction(
                    validUpdates.map((update) =>
                        prisma.aCL.update({
                            where: { id: update.aclId },
                            data: { roleId: update.roleId },
                        })
                    )
                );

                return Response.json({ message: 'Provider roles updated successfully.' });
            },
            [PermissionTypes.ProviderAccessControl],
            mapResourceForRBAC(providerName, 'Provider')
        )
    )(request, context);
}

/**
 * DELETE: Remove a user from a provider (except the provider owner).
 */
export const DELETE = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const { email } = await req.json(); // Expect email and role

                if (!email) {
                    throw ApiError.badRequest('Email is required.');
                }

                // Find the user by email
                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true }
                });

                if (!user) {
                    throw ApiError.notFound(`User with email "${email}" not found.`);
                }

                const selectedProvider = await prisma.provider.findUnique({
                    where: { name: providerName as string }
                });

                if (!selectedProvider) {
                    throw ApiError.notFound(`Provider "${providerName}" not found.`);
                }

                // Check if the user already has access to the provider
                const existingACL = await prisma.aCL.findFirst({
                    where: {
                        userId: user.id,
                        providerId: selectedProvider.id
                    },
                    select: { id: true, Role: { select: { name: true } } }
                });

                if (existingACL) {
                    if (existingACL.Role.name === RoleTypes.ProviderOwner) {
                        throw ApiError.badRequest('Cannot remove the owner of the provider.');
                    }
                    await prisma.aCL.delete({
                        where: { id: existingACL.id }
                    });
                    return Response.json({
                        message: 'User removed successfully from the provider.',
                    });
                }

                throw ApiError.badRequest('User does not have access to this provider.');
            },
            [PermissionTypes.ProviderAccessControl],
            mapResourceForRBAC(providerName, 'Provider')
        )
    )(request, context);
}