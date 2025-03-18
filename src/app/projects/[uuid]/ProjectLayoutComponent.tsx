'use client';

import { useState } from 'react';
import { List, Users, Rocket, Settings, Component, ChartPie, PlugZap, ArrowRightFromLine } from 'lucide-react'; // Import required icons
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { PermissionTypes, RoleTypes } from '@/types/prisma/RBACTypes';
import { ProjectProvider } from '@/lib/context/ProjectContext';
import { useSession } from 'next-auth/react';
import { CustomProject } from '@/app/api/projects/[projectUUID]/function';
import { ROUTES } from '@/lib/route';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { roleHasPermission } from '@/lib/function/RBACFunction';
import { useAppContext } from '@/lib/context/AppContext';

export default function ProjectLayoutComponent({
    children,
    project
}: {
    children: React.ReactNode;
    project: CustomProject;
}) {
    const { data: session } = useSession();
    const pathName = usePathname();
    const { uuid } = useParams() || {};
    const [isError,] = useState(false);
    const {showProjectTab, toggleProjectTab} = useAppContext();

    // Function to check if a link is active
    const isActiveLink = (path: string) => decodeURIComponent(pathName) === path;

    if (isError) {
        return <div>Error fetching project data</div>;
    }

    return (
        <ProjectProvider project={project}>
            <Breadcrumb>
                <div className='relative left-0'>
                    {`Projects / ${project?.uuid}`}
                </div>
            </Breadcrumb>
            <div className="flex flex-grow bg-gray-100 overflow-auto">
                {/* Left Sidebar */}
                <aside className={`bg-white shadow-md flex flex-col ${showProjectTab ? 'max-w-60 min-w-60 w-60' : 'max-w-14 min-w-14 w-14'} overflow-hidden transition-all`}>
                    <div className='p-4 border-b relative'>
                        {showProjectTab &&
                            <>
                                <h2 className="text-lg font-semibold text-gray-800">{project?.name}</h2>
                                <div className='text-sm text-gray-500 mt-2'>{project?.description}</div>
                            </>
                        }
                        {
                            !showProjectTab && (
                                <div className='h-[57px]'></div>
                            )
                        }
                        <div className={`${showProjectTab ? 'absolute':'absolute left-1/2 -translate-x-1/2'} right-4 top-1/2 -translate-y-1/2`}>
                            <ArrowRightFromLine className={`w-5 h-5 text-gray-500 hover:text-gray-600 cursor-pointer ${showProjectTab ? 'transform rotate-180' : ''}`} onClick={()=>toggleProjectTab()} />
                        </div>
                    </div>
                    <div className="mb-6 text-md">
                        <ul className="flex flex-col">
                            <Link href={ROUTES.PROJECT(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT(uuid as string))
                                ? 'text-indigo-700 font-bold bg-slate-100'
                                : 'text-gray-600 hover:text-indigo-500'
                                }`}>
                                <List className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                {showProjectTab && 'Overview'}
                            </Link>
                            <Link href={ROUTES.PROJECT_VISUALIZATION(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_VISUALIZATION(uuid as string))
                                ? 'text-indigo-700 font-bold bg-slate-100'
                                : 'text-gray-600 hover:text-indigo-500'
                                }`}>
                                <Component className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                {showProjectTab && 'Visualization'}
                            </Link>
                            <Link href={ROUTES.PROJECT_DEPLOYMENTS(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_DEPLOYMENTS(uuid as string))
                                ? 'text-indigo-700 font-bold bg-slate-100'
                                : 'text-gray-600 hover:text-indigo-500'
                                }`}>
                                <Rocket className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                {showProjectTab && 'Deployments'}
                            </Link>
                            {/* <Link href={ROUTES.PROJECT_VERSION_CONTROL(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_VERSION_CONTROL(uuid as string))
                                ? 'text-indigo-700 font-bold bg-slate-100'
                                : 'text-gray-600 hover:text-indigo-500'
                                }`}>
                                <FolderGit2 className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                {showProjectTab && 'Version Control'}
                            </Link> */}
                            {
                                roleHasPermission(project?.role.name as RoleTypes, [PermissionTypes.ProjectRead]) && (
                                    <Link href={ROUTES.PROJECT_MEMBERS(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_MEMBERS(uuid as string))
                                        ? 'text-indigo-700 font-bold bg-slate-100'
                                        : 'text-gray-600 hover:text-indigo-500'
                                        }`}>
                                        <Users className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                        {showProjectTab && 'Members'}
                                    </Link>
                                )
                            }
                            {
                                (session?.user?.role === RoleTypes.Admin || session?.user?.role === RoleTypes.SuperAdmin) && (
                                    <Link href={ROUTES.PROJECT_QUOTA(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_QUOTA(uuid as string))
                                        ? 'text-indigo-700 font-bold bg-slate-100'
                                        : 'text-gray-600 hover:text-indigo-500'
                                        }`}>
                                        <ChartPie className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                        {showProjectTab && 'Resource Quota'}
                                    </Link>
                                )
                            }
                            {
                                (roleHasPermission(project?.role.name as RoleTypes, [PermissionTypes.ProjectProviderRead])) && (
                                    <Link href={ROUTES.PROJECT_PROVIDERS(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_PROVIDERS(uuid as string))
                                        ? 'text-indigo-700 font-bold bg-slate-100'
                                        : 'text-gray-600 hover:text-indigo-500'
                                        }`}>
                                        <PlugZap className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                        {showProjectTab && 'Providers'}
                                    </Link>
                                )
                            }
                            {
                                project?.role.name === RoleTypes.ProjectOwner && (
                                    <Link href={ROUTES.PROJECT_SETTINGS(uuid as string)} className={`cursor-pointer whitespace-nowrap px-4 py-2 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_SETTINGS(uuid as string))
                                        ? 'text-indigo-700 font-bold bg-slate-100'
                                        : 'text-gray-600 hover:text-indigo-500'
                                        }`}>
                                        <Settings className={`w-5 h-5 ${showProjectTab ? 'mr-3':'m-auto'}`} />
                                        {showProjectTab && 'Settings'}
                                    </Link>
                                )
                            }
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-grow overflow-auto flex flex-col bg-dots-pattern shadow-inner">
                    {project && children}
                </main>
            </div>
        </ProjectProvider>
    );
}