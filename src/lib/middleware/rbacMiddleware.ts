import prisma from '@/lib/prisma';
import { PermissionTypes, RoleTypes } from '@/types/prisma/RBACTypes';
import { UserVerificationStatus } from '@/types/prisma/UserVerificationStatus';
import { auth } from '@/auth';
import { ApiError } from '@/types/api/apiError';
import { Session } from 'next-auth';

export async function authMiddleware(
    next: (req: Request, context?: any) => Promise<Response>,
    req?: Request,
    context: any = {}
) {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
        throw ApiError.unauthorized('You must be logged in to access this resource');
    }

    if (session.user.status !== UserVerificationStatus.VERIFIED) {
        throw ApiError.forbidden('User is not verified');
    }

    // Attach session to the context (even if context is undefined initially)
    context.session = session;

    // Pass req and modified context to the next handler
    return next(req!, context);
}

export const superAdminMiddleware = async (session: Session) => {
    const user = session?.user;
    if (!user || !user.email) {
        throw ApiError.unauthorized('Unauthorized: User not found');
    }

    const isSuperAdmin = user.role === RoleTypes.SuperAdmin;

    if (!isSuperAdmin) {
        throw ApiError.unauthorized('Unauthorized: Requires SuperAdmin role');
    }
};

export const adminMiddleware = async (session: Session) => {
    const user = session?.user;
    if (!user || !user.email) {
        throw ApiError.unauthorized('Unauthorized: User not found');
    }

    const isSuperAdmin = user.role === RoleTypes.SuperAdmin || user.role === RoleTypes.Admin;

    if (!isSuperAdmin) {
        throw ApiError.unauthorized('Unauthorized: Requires SuperAdmin role');
    }
};

export const rbacMiddleware = async (
    session: Session,
    requiredPermissions: PermissionTypes[],
    resources: Record<string, any | undefined> | undefined = undefined
) => {
    const user = session.user;
    if (!user || !user.email) {
        throw ApiError.unauthorized('Unauthorized: User not found');
    }

    if (requiredPermissions.length === 0) {
        throw ApiError.badRequest('Permissions not specified');
    }

    // Check if the user is an admin; admins have access to all resources
    const isAdmin = user.role === RoleTypes.SuperAdmin || user.role === RoleTypes.Admin;
    if (isAdmin) {
        return; // Admins are allowed to access all resources
    }

    let hasAccess = false;

    if (resources && Object.keys(resources).length > 0) {
        // Resource-based permission check (e.g., projectId, providerId)
        for (const [resourceType, resourceId] of Object.entries(resources)) {
            if (resourceId) {
                // Dynamically query ACLs for user-specific access to resources
                const aclCheck = await prisma.aCL.findFirst({
                    where: {
                        userId: user.id,
                        [`${resourceType}`]: resourceId, // Dynamically match resource type
                    },
                    include: {
                        Role: {
                            include: {
                                RolePermissions: { include: { permission: true } },
                            },
                        },
                    },
                });

                if (aclCheck) {
                    // Verify required permissions against ACLs
                    const hasRequiredPermissions = requiredPermissions.every(requiredPermission =>
                        aclCheck.Role?.RolePermissions.some(rolePermission =>
                            rolePermission.permission.name === requiredPermission
                        )
                    );

                    if (hasRequiredPermissions) {
                        hasAccess = true;
                        break; // Exit loop if access is granted for any resource
                    }
                }
            }
        }
    } else if (user.role !== null) {
        const userRole = await prisma.role.findUnique({
            where: { name: user.role }
        });
        if(!userRole) {
            throw ApiError.notFound('Role not found');
        }
        // No specific resource provided; check user's global permissions across all roles
        const userRolePermissions = await prisma.rolePermission.findMany({
            where: {
                roleId: { equals: userRole?.id } // Check permissions for all roles the user has
            },
            include: { permission: true },
        });
    
        // Verify global permissions based on user's roles
        const hasGlobalPermissions = requiredPermissions.every(requiredPermission =>
            userRolePermissions.some(rolePermission =>
                rolePermission.permission.name === requiredPermission
            )
        );
    
        if (hasGlobalPermissions) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
        throw ApiError.forbidden('Forbidden: Access denied');
    }
};