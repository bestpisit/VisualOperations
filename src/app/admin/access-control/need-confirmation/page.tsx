import { auth } from '@/auth';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import { redirect } from 'next/navigation';
import React from 'react'
import NeedConfirmationTab from './AccessControlConfirm';
const page = async () => {
    const session = await auth();

    if (!session) {
        return redirect('/login');
    }
    if (session.user.role !== RoleTypes.Admin && session.user.role !== RoleTypes.SuperAdmin) {
        return redirect('/dashboard');
    }
    return (
        <NeedConfirmationTab />
    )
}

export default page