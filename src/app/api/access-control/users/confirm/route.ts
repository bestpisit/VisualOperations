import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import { UserVerificationStatus } from '@/types/prisma/UserVerificationStatus';
import { RoleTypes } from '@/types/prisma/RBACTypes';

export const POST = withAPIHandler(withAuthAndAdmin(async (req) => {
    if(!req){
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    try {
        const {userId} = await req.json();

        if (!userId) {
            return Response.json({ error: 'Missing userId' }, { status: 400 });
        }

        const verifiedUserRole = await prisma.user.findFirst({
            where: { id: userId },
            select: {
                role: { select: { name: true } },
            },
        });

        const userRole = await prisma.role.findFirst({
            where: {
                name: verifiedUserRole?.role?.name || RoleTypes.User,
            },
        });

        if (!userRole) {
            return Response.json({ error: 'User role not found' }, { status: 500 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                status: UserVerificationStatus.VERIFIED,
                role: {
                    connect: { id: userRole.id },
                },
            },
        });

        return Response.json(user, { status: 200 });
    } catch (e:any) {
        console.error('Unexpected error:', e);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}));
