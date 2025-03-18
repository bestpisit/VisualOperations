import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import { roleLevels, RoleTypes } from '@/types/prisma/RBACTypes';
import { auth } from '@/auth';

export const POST = withAPIHandler(withAuthAndAdmin(async (req) => {
    const session = await auth();
    if(!req || !session){
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    try {
        const { userId, roleName } = await req.json();
        const user = session.user;

        // Validate input
        if (!userId || !roleName) {
            return Response.json({ error: 'Missing userId or roleName.' }, { status: 400 });
        }

        // Prevent the user from changing their own role
        if (user.id === userId) {
            return Response.json({ error: 'You cannot change your own role.' }, { status: 400 });
        }

        // Get the role level of the current user (the one performing the action)
        const adminRoleLevel = roleLevels[user.role.name];

        // Ensure the role they are trying to assign is not SuperAdmin (restricted)
        if (roleName === RoleTypes.SuperAdmin) {
            return Response.json({ error: 'Cannot assign the SuperAdmin role.' }, { status: 400 });
        }

        // Find the target user and their current role
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: { select: { name: true } },
            },
        });

        if (!targetUser) {
            return Response.json({ error: `User with ID "${userId}" not found.` }, { status: 404 });
        }

        if (!targetUser.role) {
            return Response.json({ error: `User with ID "${userId}" does not have an assigned role.` }, { status: 400 });
        }

        // Get the role level of the target user and the new role to assign
        const targetRoleLevel = roleLevels[targetUser.role.name];

        // Prevent Admins from modifying roles of users with the same or higher role level
        if (targetRoleLevel <= adminRoleLevel) {
            return Response.json({
                error: `Cannot modify users with an equal or higher role (${targetUser.role.name}).`,
            }, { status: 400 });
        }

        // Find the new role in the database
        const newRole = await prisma.role.findUnique({
            where: { name: roleName },
        });

        if (!newRole) {
            return Response.json({ error: `Role "${roleName}" not found.` }, { status: 400 });
        }

        // Update the user's role
        await prisma.user.update({
            where: { id: userId },
            data: {
                role: {
                    connect: { id: newRole.id },
                },
            },
        });

        return Response.json({ message: 'Role updated successfully.' }, { status: 200 });
    } catch (e:any) {
        console.error('Error updating role:', e);
        return Response.json({ error: 'An error occurred during the role update.' }, { status: 500 });
    }
}));
