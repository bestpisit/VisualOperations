// app/access-control/components/NavLinks.tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavLinksProps {
    isSuperAdmin: boolean;
}

export default function NavLinks({ isSuperAdmin }: NavLinksProps) {
    const pathname = usePathname();

    return (
        <div className="flex m-4 mt-0 bg-white text-sm sm:text-sm md:text-base lg:text-base xl:text-base">
            <div className='p-1 py-3 bg-slate-50 shadow-inner rounded-lg'>
                <Link
                    href="/admin/access-control/users"
                    className={`p-2 px-4 rounded-lg ${pathname === '/admin/access-control/users' ? 'shadow-sm bg-white text-secondary-300' : 'text-gray-500'}`}
                >
                    Users
                </Link>
                {isSuperAdmin && (
                    <Link
                        href="/admin/access-control/roles"
                        className={`p-2 px-4 rounded-lg ${pathname === '/admin/access-control/roles' ? 'shadow-sm bg-white text-secondary-300' : 'text-gray-500'}`}
                    >
                        Roles
                    </Link>
                )}
                <Link
                    href="/admin/access-control/need-confirmation"
                    className={`p-2 px-4 rounded-lg ${pathname === '/admin/access-control/need-confirmation' ? 'shadow-sm bg-white text-secondary-300' : 'text-gray-500'}`}
                >
                    Need Confirmation
                </Link>
                <Link
                    href="/admin/access-control/access-logs"
                    className={`p-2 px-4 rounded-lg ${pathname === '/admin/access-control/access-logs' ? 'shadow-sm bg-white text-secondary-300' : 'text-gray-500'}`}
                >
                    Access Logs
                </Link>
            </div>
        </div>
    );
}