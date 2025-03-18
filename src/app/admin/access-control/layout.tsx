import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import NavLinks from '@/components/access-control/NavLinks';
import AddUserDialog from '@/components/access-control/AddUserDialog';

export default async function AccessControlLayout({ children }: { children: ReactNode }) {
    const session = await auth();

    if (!session) {
        return redirect('/login');
    }
    if (session.user.role !== RoleTypes.Admin && session.user.role !== RoleTypes.SuperAdmin) {
        return redirect('/unauthorized');
    }

    const isSuperAdmin = session.user.role === RoleTypes.SuperAdmin;

    return (
        <div className="flex-grow w-full h-full flex flex-col bg-white overflow-auto">
            <div className="flex justify-items-start p-4 py-0 bg-white h-[80px]">
                <p className="font-bold text-2xl text-slate-800 text-center my-auto">Access Control</p>
            </div>
            <div className='flex justify-between items-center pr-4'>
                <NavLinks isSuperAdmin={isSuperAdmin} />
                <AddUserDialog />
            </div>
            <div className="flex-grow w-full h-full overflow-auto shadow-inner bg-slate-50 p-4">
                {children}
            </div>
        </div>
    );
}