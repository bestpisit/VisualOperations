import { auth } from '@/auth';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import prisma from '@/lib/prisma';
import { ApiError } from '@/types/api/apiError';
import { roleLevels, RoleTypes } from '@/types/prisma/RBACTypes';

export const POST = withAPIHandler(withAuthAndAdmin(async (req) => {
    const session = await auth();
    if(!req || !session){
        throw ApiError.badRequest('Unauthorized: User not found');
    }
    try {
        const { users } = await req.json(); // Expect an array of users [{ userId, newRole }, ...]
        const user = session.user;
        const adminUserId = user.id;

        const adminRoleLevel = roleLevels[user.role.name]; // Admin user's role level

        // Validate the input
        if (!users || !Array.isArray(users)) {
            return Response.json({ error: 'Invalid request body.' }, { status: 400 });
        }

        // Prepare valid updates for the transaction
        const validUpdates = [];

        for (const { userId, newRole } of users) {
            if (!userId || !newRole) {
                return Response.json({ error: 'Missing userId or newRole.' }, { status: 400 });
            }

            // Prevent assigning SuperAdmin role or modifying own role
            if (newRole === RoleTypes.SuperAdmin) {
                return Response.json({ error: 'Cannot assign the SuperAdmin role.' }, { status: 400 });
            }
            if (adminUserId === userId) {
                return Response.json({ error: 'You cannot change your own role.' }, { status: 400 });
            }

            // Find the target user and their role
            const targetUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { role: { select: { name: true } } },
            });

            if (!targetUser) {
                return Response.json({ error: `User with ID "${userId}" not found.` }, { status: 404 });
            }

            // Ensure target user has a role (default to basic user role if missing)
            const targetRoleLevel = roleLevels[targetUser.role?.name || RoleTypes.User];

            // Prevent modification of users with higher or equal roles
            if (targetRoleLevel <= adminRoleLevel) {
                return Response.json({
                    error: `Cannot modify users with an equal or higher role (${targetUser.role?.name || RoleTypes.User}).`,
                }, { status: 400 });
            }

            // Find the new role to assign
            const newRoleData = await prisma.role.findUnique({
                where: { name: newRole },
            });

            if (!newRoleData) {
                return Response.json({ error: `Role "${newRole}" not found.` }, { status: 400 });
            }

            // Collect valid updates for transaction
            validUpdates.push({
                userId,
                roleId: newRoleData.id,
            });
        }

        // Perform role updates in a transaction
        await prisma.$transaction(
            validUpdates.map((update) =>
                prisma.user.update({
                    where: { id: update.userId },
                    data: { role: { connect: { id: update.roleId } } },
                })
            )
        );

        return Response.json({ message: 'Roles updated successfully.' }, { status: 200 });
    } catch (e: any) {
        console.error('Error updating roles:', e);
        return Response.json({ error: e.error || 'An error occurred during role update.' }, { status: 500 });
    }
}));