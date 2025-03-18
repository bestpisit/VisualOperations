// app/api/admin/roles/[roleId]/permissions/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';

export const PUT = withAPIHandler(withAuthAndAdmin(async (
    req,
    context: { params: { roleId: string } }
) => {
    const { roleId } = context.params;

    if (!roleId || isNaN(Number(roleId))) {
        return NextResponse.json({ error: 'Invalid roleId.' }, { status: 400 });
    }

    try {
        const { permissionIds } = await req.json();

        if (!Array.isArray(permissionIds)) {
            return NextResponse.json({ error: 'permissionIds must be an array.' }, { status: 400 });
        }

        const roleIdNum = parseInt(roleId, 10);

        // Validate that all permission IDs exist
        const permissions = await prisma.permission.findMany({
            where: { id: { in: permissionIds } },
        });

        if (permissions.length !== permissionIds.length) {
            return NextResponse.json({ error: 'One or more permissions are invalid.' }, { status: 400 });
        }

        // Delete existing permissions for the role
        await prisma.rolePermission.deleteMany({
            where: { roleId: roleIdNum },
        });

        // Assign new permissions to the role
        const rolePermissionsData = permissionIds.map((permissionId: number) => ({
            roleId: roleIdNum,
            permissionId,
        }));

        await prisma.rolePermission.createMany({
            data: rolePermissionsData,
        });

        return NextResponse.json({ message: 'Permissions updated successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Error updating permissions:', error);
        return NextResponse.json({ error: 'Failed to update permissions.' }, { status: 500 });
    }
}));
