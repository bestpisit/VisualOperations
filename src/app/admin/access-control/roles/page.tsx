import { auth } from '@/auth';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import { redirect } from 'next/navigation';
import React from 'react'
import RolesTab from './AccessControlRoles';

const page = async () => {
    const session = await auth();

    if (!session) {
        return redirect('/login');
    }
    if (session.user.role !== RoleTypes.SuperAdmin) {
        return redirect('/access-control');
    }
    return (
        <RolesTab />
    )
}

export default page