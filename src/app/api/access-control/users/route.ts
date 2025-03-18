export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { withAuthAndAdmin, withAPIHandler } from '@/lib/middleware/apiWithMiddleware';
import { ApiError } from '@/types/api/apiError';
import { hashPassword, validatePassword } from '@/lib/security/authentication';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import { UserVerificationStatus } from '@/types/prisma/UserVerificationStatus';

export const GET = withAPIHandler(withAuthAndAdmin(async () => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                role: true
            },
            orderBy: {
                id: 'asc'
            }
        });
        return Response.json(users);
    } catch (e: any) {
        console.error('Unexpected error:', e);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}));

export const POST = withAPIHandler(withAuthAndAdmin(async (req) => {
    try {
        const { name, email, password } = await req.json();
        if(!name || !email || !password) {
            throw ApiError.badRequest('Missing required fields.');
        }
        if (!validatePassword(password)) {
            throw ApiError.badRequest('Password does not meet security requirements.');
        }
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw ApiError.badRequest('User already exists.');
        }
        const hashedPassword = await hashPassword(password);
        const defaultRole = await prisma.role.findFirst({
            where: { name: RoleTypes.User },
        });
        if (!defaultRole) {
            throw ApiError.internalServerError('Default role not found.');
        }
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: {
                    connect: { id: defaultRole.id },
                },
                status: UserVerificationStatus.VERIFIED
            }
        });
        return Response.json(user);
    } catch (e: any) {
        throw ApiError.internalServerError(e);
    }
}));