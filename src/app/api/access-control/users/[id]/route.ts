import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import { roleLevels, RoleTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/security/authentication';
import { auth } from '@/auth';

function validateUpdateInput(data: any) {
    const errors = [];
    if (data.name && data.name.length < 3) errors.push('Name must be at least 3 characters.');
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) errors.push('Invalid email format.');
    return errors;
}

export const PUT = withAPIHandler(
    withAuthAndAdmin(
        async (req, { params }: { params: { id: string | undefined } }) => {
            if (params.id === undefined || !params.id) throw ApiError.badRequest('ID is required');
            const id = params.id;
            const userData = await req.json();
            const session = await auth();

            const validationErrors = validateUpdateInput(userData);
            if (validationErrors.length) {
                throw ApiError.badRequest(validationErrors.join(' '));
            }

            const existingUser = await prisma.user.findUnique({ where: { id }, include: { role: true } });
            if (!existingUser) throw ApiError.notFound('User not found.');

            const sessionRole = roleLevels[session?.user?.role];
            const targetRole = roleLevels[existingUser?.role?.name || RoleTypes.User];

            if (!sessionRole || !targetRole) {
                throw ApiError.internalServerError('Role not found.');
            }

            if (sessionRole >= targetRole && session?.user?.role !== RoleTypes.SuperAdmin) {
                throw ApiError.forbidden('Cannot update users with an equal or higher role.');
            }

            if (userData.email && userData.email !== existingUser.email) {
                const emailInUse = await prisma.user.findUnique({
                    where: { email: userData.email },
                });
                if (emailInUse) {
                    throw ApiError.badRequest('Email is already in use by another user.');
                }
            }

            const updatedData: any = { ...userData };
            if (userData.password) {
                updatedData.password = await hashPassword(userData.password);
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updatedData,
            });

            return Response.json({ message: 'User updated successfully.', user: updatedUser });
        }
    )
);

export const DELETE = withAPIHandler(
    withAuthAndAdmin(
        async (_, { params }: { params: { id: string | undefined } }) => {
            if (params.id === undefined || !params.id) throw ApiError.badRequest('ID is required');
            const id = params.id;

            const existingUser = await prisma.user.findUnique({ where: { id }, include: { role: true } });
            const session = await auth();

            if (session?.user?.id === id) {
                throw ApiError.badRequest('Cannot delete your own account.');
            }
            if (!existingUser) throw ApiError.notFound('User not found.');

            const sessionRole = roleLevels[session?.user?.role];
            const targetRole = roleLevels[existingUser?.role?.name || RoleTypes.User];

            if (!sessionRole || !targetRole) {
                throw ApiError.internalServerError('Role not found.');
            }

            if (sessionRole >= targetRole) {
                throw ApiError.forbidden('Cannot delete users with an equal or higher role.');
            }

            await prisma.user.delete({ where: { id } });

            return Response.json({ message: 'User deleted successfully.' });
        }
    )
);