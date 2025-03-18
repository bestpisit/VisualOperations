'use client';
import React, { useEffect, useState } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next-nprogress-bar';
import { ROUTES } from '@/lib/route';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { ImageInventory } from '@/images/ImageInventory';
import { Resource } from '@prisma/client';
import axios from 'axios';
import { formatDateThai } from '@/lib/utils';
import ImageInventoryManager from '@/images/ImageInventoryManager';
import { RefreshStatusResponse } from '@/app/api/projects/[projectUUID]/refresh/route';

// const resources = [
//     { name: 'vm-gateway', icons: [ImageInventory.Icon.Server, ImageInventory.Icon.Nutanix], type: 'Infrastructure', description: 'Gateway Virtual Machine', createdAt: '2024-01-12', status: 'Running', tags: ['todo'] },
//     { name: 'vm-todo', icons: [ImageInventory.Icon.Server, ImageInventory.Icon.Proxmox], type: 'Infrastructure', description: 'Todo Virtual Machine', createdAt: '2024-01-10', status: 'Running', tags: ['todo'] },
//     { name: 'Todo Docker', icons: [ImageInventory.Icon.Docker], type: 'Application', description: 'Docker container for Todo Application', createdAt: '2024-01-03', status: 'Running', tags: ['todo'] },
//     { name: 'mySQL', icons: [ImageInventory.Icon.Docker, ImageInventory.Ic/on.MySQL], type: 'Application', description: 'MySQL for Todo Application', createdAt: '2024-01-03', status: 'Running', tags: ['todo'] },
// ];

export default function ProjectDashboard() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [resources, setResources] = useState<Resource[]>([]);
    const fetchResources = async () => {
        try {
            const response = await axios.get(`/api/projects/${uuid}/resources`);
            const resources = response.data as Resource[];
            setResources(resources);
        } catch (error) {
            console.error('Error fetching resources:', error);
        }
    };
    useEffect(() => {
        fetchResources();
        fetchRefreshStatus();
    }, []);
    const router = useRouter();
    const { uuid } = useParams() || {};

    // Function to handle creating resources
    const handleCreate = async () => {
        router.push(ROUTES.TEMPLATES); // Redirect to create resource page
    };

    const fetchRefreshStatus = async () => {
        try {
            const response = await axios.get(`/api/projects/${uuid}/refresh`);
            const isRefreshing = response.data.isRefreshing;
            if (isRefreshing) {
                setIsRefreshing(true);
            }
        } catch (error) {
            console.error('Error fetching refresh status:', error);
        }
    }

    const handleRefresh = async (): Promise<void> => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const res = await axios.post<RefreshStatusResponse>(`/api/projects/${uuid}/refresh`);
            const refresh = res.data?.isRefreshing;
            if (!refresh) {
                setIsRefreshing(false);
            }
        } catch (error) {
            console.error("Error refreshing resources:", error);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isRefreshing) {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get<RefreshStatusResponse>(`/api/projects/${uuid}/refresh`);
                    const refresh = res.data?.isRefreshing;
                    if (!refresh) {
                        setIsRefreshing(false);
                        fetchResources();
                        clearInterval(interval);
                    }
                } catch (error) {
                    console.error("Error polling resource status:", error);
                    setIsRefreshing(false);
                    if (interval) clearInterval(interval);
                }
            }, 2000); // Poll every 1 second
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRefreshing, uuid]);

    return (
        <div className='border-l flex-grow flex flex-col'>
            {/* Action Bar */}
            <div className="bg-slate-50 px-4 py-2 flex justify-start items-center space-x-4 border-b">
                <button
                    onClick={handleCreate}
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Resource</span>
                </button>
                <button
                    onClick={handleRefresh}
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>

            {/* Project Overview Table */}
            <div className="p-6 py-0 overflow-x-auto">
                <h1 className="text-xl font-bold my-4 text-secondary-250">Resources</h1>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto bg-white shadow-md rounded-lg" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-4 py-2 text-left">Resource Name</th>
                                <th className="px-4 py-2 text-left">Resource Type</th>
                                <th className="px-4 py-2 text-left">Provider</th>
                                <th className="px-4 py-2 text-center">Created At</th>
                                {/* <th className="px-4 py-2 text-center">Tags</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {resources.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((resource, index) => (
                                <tr key={index} className="border-b max-h-[40px] min-h-[40px] h-[40px] overflow-auto">
                                    <td key={index} className="px-4 pl-2 py-2 flex gap-2">
                                        {
                                            (resource as any).imageKey?.map((imageKey: string, idx: number) => (
                                                <Image
                                                    key={idx}
                                                    width={25}
                                                    height={25}
                                                    alt={ImageInventory.Icon.Proxmox.src}
                                                    src={ImageInventoryManager.getImageUrl(imageKey)}
                                                />
                                            ))
                                        }
                                        <p
                                            onClick={() =>
                                                router.push(
                                                    `${ROUTES.PROJECT_RESOURCE(
                                                        Array.isArray(uuid) ? uuid[0] : uuid,
                                                        resource.uuid
                                                    )}`
                                                )
                                            }
                                            className="hover:underline text-blue-500 whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                                        >
                                            {resource.name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis">{(resource as any)?.deployment?.template?.name}</td>
                                    <td className="px-4 py-2 text-left">
                                        {(resource as any)?.providerName}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis text-center">{formatDateThai(new Date(resource.createdAt))}</td>
                                    {/* <td className="px-4 py-2 text-center">
                                        {resource.tags?.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800 whitespace-nowrap"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}