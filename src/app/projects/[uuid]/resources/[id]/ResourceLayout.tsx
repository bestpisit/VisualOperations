'use client';
import { ReactNode, useState } from 'react';
import { CircleAlert, Delete, Info, List, TriangleAlert } from 'lucide-react'; // Import required icons
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useResourceContext } from '@/lib/context/ResourceContext';
import { ROUTES } from '@/lib/route';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from 'axios';
import { JsonObject } from '@prisma/client/runtime/library';
import LoadingSpinner from '@/components/LoadingSpinner';
import { handleApiError } from '@/types/api/apiError';
import ImageInventoryManager from '@/images/ImageInventoryManager';

interface ResourceLayoutProps {
    children: ReactNode;
}

const ResourceLayout: React.FC<ResourceLayoutProps> = ({ children }) => {
    const router = useRouter();
    const { uuid, id } = useParams() || {};
    const { resource, loading: isLoading } = useResourceContext();
    const [isError, ] = useState(false);

    const pathname = usePathname(); // ✅ Hook always called at the top level

    const isActiveLink = (path: string) => {
        return decodeURIComponent(pathname) === path;
    };

    if (isError) {
        return <div>Error fetching resource data</div>;
    }

    const handleDeleteDeployment = async (force: boolean = false) => {
        setLoading(true);
        try {
            const response = await axios.delete(`/api/projects/${uuid}/resources/${id}`, { data: { force } });
            if (response.status === 200) {
                if (response.data?.status === "ok") {
                    router.push(ROUTES.PROJECT_DEPLOYMENTS(uuid as string));
                    toast.success('Deployment deleted successfully');
                }
                else if (response.data?.status === "failed") {
                    setResourceDependency(response.data?.resourceDependency || []);
                    setDependencyDialogOpen(true);
                }
                else {
                    toast.error('Failed to delete deployment');
                }
            }
            else {
                toast.error('Failed to delete deployment');
            }
        } catch (e) {
            toast.error(handleApiError(e));
        }
        finally {
            setLoading(false);
        }
    }

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [resourceDependency, setResourceDependency] = useState<JsonObject[]>([]);
    const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    if(!resource && !isLoading) {
        return <div className='flex flex-col flex-grow border-l justify-center items-center gap-4'>
            <CircleAlert className='w-20 h-20 text-red-500' />
            <div className='text-red-500'>Resource not found</div>
        </div>
    }

    if (isLoading) {
        return <div className='flex flex-col bg-white flex-grow border-l justify-center items-center'>
            <LoadingSpinner size="w-20 h-20" />
        </div>
    }

    return (
        <>
            <div className='flex flex-col flex-grow border-l'>
                <div className="p-2 flex gap-2 border-b bg-gradient-to-r from-secondary-100 from-30% via-green-200 to-secondary-200">
                    {
                        (resource as any)?.imageKey?.map((key: string, index: number) => (
                            <Image key={index} src={ImageInventoryManager.getImageUrl(key)} alt="Resource" width={32} height={32} className="rounded-lg my-auto" />
                        ))
                    }
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{resource?.name}</h2>
                        <div>{(resource as any)?.deployment?.template?.name}</div>
                    </div>
                </div>
                <div className="flex flex-grow bg-gray-100 overflow-auto">
                    {/* Left Sidebar */}
                    <aside className="w-60 bg-white text-md flex flex-col border-r">
                        <ul className="flex flex-col">
                            <Link
                                href={ROUTES.PROJECT_RESOURCE(uuid as string, id as string)}
                                className={`cursor-pointer px-4 py-1 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_RESOURCE(uuid as string, id as string))
                                    ? 'text-indigo-700 font-bold bg-slate-100'
                                    : 'text-gray-600 hover:text-indigo-500'
                                    }`}
                            >
                                <List className="w-5 h-5 mr-3" />
                                Overview
                            </Link>
                            <Link
                                href={ROUTES.PROJECT_RESOURCE_DETAILS(uuid as string, id as string)}
                                className={`cursor-pointer px-4 py-1 items-center flex break-words ${isActiveLink(ROUTES.PROJECT_RESOURCE_DETAILS(uuid as string, id as string))
                                    ? 'text-indigo-700 font-bold bg-slate-100'
                                    : 'text-gray-600 hover:text-indigo-500'
                                    }`}
                            >
                                <Info className="w-5 h-5 mr-3" />
                                Details
                            </Link>
                            <button
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className={`cursor-pointer px-4 py-1 items-center flex break-words text-gray-600 hover:text-indigo-500`}
                            >
                                <Delete className="w-5 h-5 mr-3" />
                                Delete
                            </button>
                        </ul>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-grow overflow-auto flex flex-col bg-white shadow-inner">
                        {children}
                    </main>
                </div>
            </div>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Resource</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this resource? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={loading}
                            onClick={async () => {
                                try {
                                    await handleDeleteDeployment();
                                } catch (error) {
                                    toast.error("Failed to delete resource");
                                    console.error(error);
                                } finally {
                                    setIsDeleteDialogOpen(false);
                                }
                            }}
                        >
                            Confirm Delete
                            {loading && <LoadingSpinner className='border-white' />}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className='mb-5 flex items-center gap-4'>
                            <TriangleAlert className='w-6 h-6 text-red-500' />
                            Dependency Alert
                            <TriangleAlert className='w-6 h-6 text-red-500' />
                        </DialogTitle>
                        <DialogDescription>
                            {
                                resourceDependency?.filter(d => d.type === 'deployment').length > 0 &&
                                <div className='bg-yellow-100 p-2 rounded-lg border mb-4'>
                                    <div>
                                        The following deployments are dependent on this resource. Please cancel or delete the dependent deployments before deleting this resource.
                                    </div>
                                    <ul className='list-disc list-inside text-black mt-2'>
                                        {resourceDependency?.filter(d => d.type === 'deployment')?.map((dependency: any, index) => (
                                            <li key={index} className='text-blue-600'>
                                                <Link href={ROUTES.PROJECT_DEPLOYMENT(uuid as string, dependency.name)} className='underline text-blue-500 hover:text-blue-600'>
                                                    Deployment {"(" + dependency.name + ")"}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            }
                            The following resources are dependent on this resource.
                            <div>
                                If you delete this resource, the dependent resources will also be deleted.
                            </div>
                            <div className='text-black mt-2'>
                                Resources
                            </div>
                            <ul className='list-disc list-inside text-black mt-1'>
                                {resourceDependency?.filter(d => d.type === 'resource')?.map((dependency: any, index) => (
                                    <li key={index}>{dependency.name}</li>
                                ))}
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDependencyDialogOpen(false)}>
                            Close
                        </Button>
                        {
                            resourceDependency?.filter(d => d.type === 'deployment').length <= 0 &&
                            <Button
                                variant="destructive"
                                disabled={loading}
                                onClick={async () => {
                                    try {
                                        await handleDeleteDeployment(true);
                                    } catch (error) {
                                        toast.error("Failed to delete resource");
                                        console.error(error);
                                    } finally {
                                        setDependencyDialogOpen(false);
                                    }
                                }}
                            >
                                Confirm Delete
                                {loading && <LoadingSpinner className='border-white' />}
                            </Button>
                        }
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ResourceLayout;