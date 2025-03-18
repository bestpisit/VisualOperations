export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndSuperAdmin } from '@/lib/middleware/apiWithMiddleware';

export const GET = withAPIHandler(withAuthAndSuperAdmin(async () => {
    try {
        const permissions = await prisma.permission.findMany();
        return Response.json(permissions, { status: 200 });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return Response.json({ error: 'Failed to fetch permissions.' }, { status: 500 });
    }
}));