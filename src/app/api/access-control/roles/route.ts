// app/api/admin/roles/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndSuperAdmin } from '@/lib/middleware/apiWithMiddleware';

export const GET = withAPIHandler(withAuthAndSuperAdmin(async () => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                RolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        return NextResponse.json(roles, { status: 200 });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ error: 'Failed to fetch roles.' }, { status: 500 });
    }
}));

export const POST = withAPIHandler(withAuthAndSuperAdmin(async (req) => {
    if (!req) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status : 500 });
    }
    try {
        const { name } = await req.json();

        // Check if role already exists
        const existingRole = await prisma.role.findUnique({
            where: { name },
        });

        if (existingRole) {
            return NextResponse.json({ error: 'Role already exists.' }, { status: 400 });
        }

        const role = await prisma.role.create({
            data: {
                name,
            },
        });
        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        console.error('Error creating role:', error);
        return NextResponse.json({ error: 'Failed to create role.' }, { status: 500 });
    }
}));
