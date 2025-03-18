'use client';
import { useEffect, useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import { ImageInventory } from '@/images/ImageInventory';
import { useProjectContext } from '@/lib/context/ProjectContext';
import { useRouter } from 'next-nprogress-bar';
import { ROUTES } from '@/lib/route';
import { DeploymentType } from './enum';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DeploymentStatus } from '@/types/PlatformStructure';
import { CustomDeployments } from '@/app/api/projects/[projectUUID]/deployments/route';
import { DateTime } from 'luxon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LoadingSpinner from '@/components/LoadingSpinner';
import React from 'react';
import { ChevronRight, CircleCheck, CircleX, Clock, Group, List, Loader2 } from 'lucide-react';
import { Tabs, TabsList } from "@/components/ui/tabs";
import { TabsTrigger } from "@radix-ui/react-tabs";

interface Deploymente {
    id: string;
    version: string;
    desc?: string;
    status: 'In Progress' | 'Successful' | 'Failed';
    startTime: string;
    duration?: string;
    progress?: number;
    deployer?: string;
    resources?: Array<{ src: StaticImageData, type: DeploymentType }>;
}

const todoDeployments: Deploymente[] = [
    {
        id: '1',
        version: 'v1',
        desc: 'Infrastructure Deployment',
        status: 'Successful',
        startTime: '2024-09-20 10:00:00',
        duration: '2m 50s',
        deployer: 'admin@example.com',
        resources: [
            { src: ImageInventory.Icon.Server, type: DeploymentType.Add },
            { src: ImageInventory.Icon.Proxmox, type: DeploymentType.Add },
            { src: ImageInventory.Icon.Nutanix, type: DeploymentType.Add }
        ]
    },
    {
        id: '2',
        version: 'v2',
        desc: 'Todo Application Deployment',
        status: 'Successful',
        startTime: '2024-09-19 14:00:00',
        duration: '1m 12s',
        deployer: 'pisit_pisuttipunpong@cmu.ac.th',
        resources: [
            { src: ImageInventory.Icon.Docker, type: DeploymentType.Add },
            { src: ImageInventory.Icon.PostgreSQL, type: DeploymentType.Add }
        ]
    },
    {
        id: '3',
        version: 'v3',
        desc: 'Scale up Todo Application Deployment',
        status: 'Successful',
        startTime: '2024-09-20 12:30:00',
        deployer: 'neeranuch_see@cmu.ac.th',
        resources: [
            { src: ImageInventory.Icon.Docker, type: DeploymentType.Add },
            { src: ImageInventory.Icon.Docker, type: DeploymentType.Add }
        ]
    },
    {
        id: '4',
        version: 'v4',
        desc: 'Rollback from version 3 to Version 2',
        status: 'Successful',
        startTime: '2024-09-20 12:30:00',
        deployer: 'neeranuch_see@cmu.ac.th',
        resources: [
            { src: ImageInventory.Icon.Docker, type: DeploymentType.Destroy },
            { src: ImageInventory.Icon.Docker, type: DeploymentType.Destroy }
        ]
    },
    {
        id: '5',
        version: 'v5',
        desc: 'Nginx Reverse Proxy Deployment',
        status: 'Successful',
        startTime: '2024-09-20 12:30:00',
        deployer: 'pisit_pisuttipunpong@cmu.ac.th',
        resources: [
            { src: ImageInventory.Icon.Nginx, type: DeploymentType.Add }
        ]
    },
    {
        id: '6',
        version: 'v5',
        desc: 'Nginx Reverse Proxy Deployment',
        status: 'Successful',
        startTime: '2024-09-20 12:30:00',
        deployer: 'pisit_pisuttipunpong@cmu.ac.th',
        resources: [
            { src: ImageInventory.Icon.Server, type: DeploymentType.Add },
            { src: ImageInventory.Icon.Proxmox, type: DeploymentType.Add }
        ]
    },
    {
        id: '7',
        version: 'v5',
        desc: 'Nginx Reverse Proxy Deployment',
        status: 'Successful',
        startTime: '2024-09-20 12:30:00',
        deployer: 'pisit_pisuttipunpong@cmu.ac.th',
        resources: [
            { src: ImageInventory.Icon.Server, type: DeploymentType.Destroy },
            { src: ImageInventory.Icon.Proxmox, type: DeploymentType.Destroy }
        ]
    },
]

export default function ProjectDeploymentsPage() {
    const router = useRouter();
    const { project } = useProjectContext();

    const [loading, setLoading] = useState<boolean>(true);
    const [deployments, setDeployments] = useState<CustomDeployments[]>([]);
    const [groupedDeployments, setGroupedDeployments] = useState<null | Record<string, CustomDeployments[]>>(null);

    const fetchDeployments = async () => {
        setLoading(true);
        const response = await axios.get(`/api/projects/${project.uuid}/deployments`);
        if (response.status === 200) {
            const data = response.data as CustomDeployments[];
            setDeployments(data);
            const group = {} as Record<string, CustomDeployments[]>;
            for (const dep of data) {
                if (!dep.parentDeploymentId) {
                    group[dep.id] = [dep];
                }
                else {
                    const targetGroup = Object.values(group).find(g => g.some(d => d.id === dep.parentDeploymentId));
                    if (targetGroup) {
                        targetGroup.push(dep);
                    }
                    else {
                        group[dep.parentDeploymentId] = [dep];
                    }
                }
            }
            setGroupedDeployments(group);
        }
        else {
            toast.error('Failed to fetch deployments');
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchDeployments();
    }, []);

    const goToDeployment = (id: string) => {
        router.push(ROUTES.PROJECT_DEPLOYMENT(project.uuid, id));
    };

    const renderDeploymentStatus = (status: DeploymentStatus) => {
        switch (status) {
            case DeploymentStatus.Pending:
                return <Clock className="w-6 h-6 mr-1 inline-block bg-blue-600 rounded-full text-white" />;
            case DeploymentStatus.Running:
                return <Loader2 className="w-6 h-6 mr-1 inline-block text-white bg-blue-600 rounded-full animate-spin duration-1000" />;
            case DeploymentStatus.Completed:
                return <CircleCheck className="w-6 h-6 mr-1 inline-block text-white bg-green-600 rounded-full" />;
            case DeploymentStatus.Failed:
                return <CircleX className="w-6 h-6 mr-1 inline-block text-white bg-red-600 rounded-full" />;
            default:
                return status;
        }
    };

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Toggle function to show/hide child deployments
    const toggleExpand = (parentId: string) => {
        setExpandedRows((prev) => ({
            ...prev,
            [parentId]: !prev[parentId],
        }));
    };

    const generateResource = (deploymentId: CustomDeployments['id']) => {
        const deployment = deployments.find(d => d.id === deploymentId);
        if (!deployment) return null;

        return (
            <div className="text-sm flex flex-col items-center justify-center font-medium text-gray-900">
                <div className='flex gap-1 justify-center items-center'>
                    {
                        !deployment.destroy && todoDeployments[5]?.resources?.map((resource, index) => (
                            <div key={index} className={`select-none rounded-md p-1 w-10 h-10 ${resource.type === DeploymentType.Add ? 'bg-green-300' : (resource.type === DeploymentType.Change ? 'bg-orange-300' : 'bg-red-300')}`}>
                                <Image src={resource.src} alt={''} className='object-contain' />
                            </div>
                        ))
                    }
                    {
                        deployment.destroy && todoDeployments[6]?.resources?.map((resource, index) => (
                            <div key={index} className={`select-none rounded-md p-1 w-10 h-10 ${resource.type === DeploymentType.Add ? 'bg-green-300' : (resource.type === DeploymentType.Change ? 'bg-orange-300' : 'bg-red-300')}`}>
                                <Image src={resource.src} alt={''} className='object-contain' />
                            </div>
                        ))
                    }
                </div>
                <div className='mt-2 text-xs text-gray-500'>
                    {
                        deployment.resourceName
                    }
                </div>
            </div>
        );
    }

    const [selectedFilter, setSelectedFilter] = useState('all');

    const handleFilterChange = (filter: string) => {
        setSelectedFilter(filter);
    };

    return (
        <div className="border-l flex-grow flex flex-col p-6 overflow-y-hidden overflow-x-auto">
            <h2 className="text-2xl font-bold mb-4 text-secondary-250 relative">
                Project Deployments
                <div className='absolute right-0 top-1/2 -translate-y-1/2 flex gap-2'>
                <div className='flex items-center'>
                    {
                        selectedFilter === 'all' && (
                            <span className='text-sm text-gray-500'>Group View</span>
                        )
                    }
                    {
                        selectedFilter === 'list' && (
                            <span className='text-sm text-gray-500'>Timeline View</span>
                        )
                    }
                </div>
                    <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="flex h-12 bg-transparent text-sm sm:text-sm md:text-base lg:text-base xl:text-base">
                        <TabsList className="p-1 py-3 bg-slate-100 rounded-lg h-full shadow-inner border">
                            <TabsTrigger value="all" className={`p-2  rounded-lg ${selectedFilter === "all" ? "shadow-sm bg-white text-secondary-250" : "text-gray-500"}`}><Group/></TabsTrigger>
                            <TabsTrigger value="list" className={`p-2  rounded-lg ${selectedFilter === "list" ? "shadow-sm bg-white text-secondary-250" : "text-gray-500"}`}><List/></TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </h2>

            <div className="overflow-x-auto bg-white relative rounded-lg shadow w-full flex-grow">
                {
                    loading && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <LoadingSpinner size='w-10 h-10' className='border-secondary-300' />
                        </div>
                    )
                }
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="select-none px-6 py-3 w-[50px] min-w-[50px] max-w-[50px] text-left text-xs font-medium text-gray-500 uppercase">
                            </TableHead>
                            <TableHead className="select-none px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Deployment
                            </TableHead>
                            <TableHead className="select-none px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Resources
                            </TableHead>
                            <TableHead className="select-none px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Trigger Time
                            </TableHead>
                            <TableHead className="select-none px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Deployer
                            </TableHead>
                            <TableHead className="select-none px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Status
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {
                            selectedFilter === 'list' && deployments.map((deployment) => (
                                <TableRow key={deployment.id} className={`hover:bg-white ${!deployment.active ? 'bg-red-100 hover:bg-red-100' : ''}`}>
                                    <TableCell className="px-6 py-2 w-[50px] min-w-[50px] max-w-[50px] whitespace-nowrap cursor-pointer">
                                        
                                    </TableCell>
                                    <TableCell className="px-6 py-2 whitespace-nowrap cursor-pointer">
                                        <div onClick={() => goToDeployment(deployment.id)} className="select-none cursor-pointer text-sm font-medium max-w-[150px] text-blue-600 hover:underline whitespace-nowrap" title={deployment.name || undefined}>
                                            {deployment.template.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="grow px-6 py-2 whitespace-nowrap cursor-pointer">
                                        {groupedDeployments && generateResource(deployment.id)}
                                    </TableCell>
                                    <TableCell className="px-6 py-2 text-center whitespace-nowrap text-sm text-gray-500">
                                        {DateTime.fromJSDate(new Date(deployment.createdAt), { zone: 'utc' })
                                            .setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
                                            .toFormat('dd MMM yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell className="px-6 py-2 text-center whitespace-nowrap text-sm text-gray-500">
                                        {deployment.user?.email}
                                    </TableCell>
                                    <TableCell className="px-6 py-2 whitespace-nowrap text-center">
                                        <div className="text-sm font-medium text-gray-900">
                                            {renderDeploymentStatus(deployment.status as DeploymentStatus)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                        {selectedFilter === 'all' && groupedDeployments && Object.entries(groupedDeployments).map(([parentId, group]) => {
                            const parentDeployment = group.find(d => d.id === parentId);
                            if (!parentDeployment) return null;

                            return (
                                <React.Fragment key={parentId}>
                                    {/* Parent Deployment Row */}
                                    <TableRow className={`hover:bg-white ${!parentDeployment.active ? 'bg-red-100' : ''}`}>
                                        <TableCell className="px-6 py-2 w-[50px] min-w-[50px] max-w-[50px] whitespace-nowrap cursor-pointer">
                                            {group.length > 1 && (
                                                <ChevronRight onClick={() => toggleExpand(parentId)} className={`text-gray-400 transition-transform duration-200 ${expandedRows[parentId] ? 'rotate-90' : ''}`} />
                                            )}
                                        </TableCell>
                                        <TableCell className="px-6 py-2 whitespace-nowrap cursor-pointer">
                                            <div onClick={() => goToDeployment(parentId)} className="select-none cursor-pointer text-sm font-medium max-w-[150px] text-blue-600 hover:underline whitespace-nowrap" title={parentDeployment.name || undefined}>
                                                {parentDeployment.template.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="grow px-6 py-2 whitespace-nowrap cursor-pointer">
                                            {generateResource(parentId)}
                                        </TableCell>
                                        <TableCell className="px-6 py-2 text-center whitespace-nowrap text-sm text-gray-500">
                                            {DateTime.fromJSDate(new Date(parentDeployment.createdAt), { zone: 'utc' })
                                                .setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
                                                .toFormat('dd MMM yyyy HH:mm')}
                                        </TableCell>

                                        <TableCell className="px-6 py-2 text-center whitespace-nowrap text-sm text-gray-500">
                                            {parentDeployment.user?.email}
                                        </TableCell>
                                        <TableCell className="px-6 py-2 whitespace-nowrap text-center">
                                            <div className="text-sm font-medium text-gray-900">
                                                {renderDeploymentStatus(parentDeployment.status as DeploymentStatus)}
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {/* Child Deployments Table (Hidden Until Expanded) */}
                                    {expandedRows[parentId] && group.length > 1 && (
                                        <>
                                            {group.slice(1).map((childDeployment) => (
                                                <TableRow key={childDeployment.id} className="bg-gray-100 border-b-0 hover:bg-gray-100">
                                                    <TableCell className="px-6 py-2 w-[50px] min-w-[50px] max-w-[50px] whitespace-nowrap cursor-pointer">
                                                    </TableCell>
                                                    <TableCell onClick={() => goToDeployment(parentId)} className="select-none px-6 py-2 whitespace-nowrap cursor-pointer text-sm font-medium max-w-[150px] text-blue-600 hover:underline">
                                                        {childDeployment.template.name}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-2 whitespace-nowrap cursor-pointer">
                                                        {generateResource(childDeployment.id)}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center py-2 whitespace-nowrap text-sm text-gray-500">
                                                        {DateTime.fromJSDate(new Date(childDeployment.createdAt), { zone: 'utc' })
                                                            .setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
                                                            .toFormat('dd MMM yyyy HH:mm')}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center py-2 whitespace-nowrap text-sm text-gray-500">
                                                        {childDeployment.user?.email}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-2 whitespace-nowrap text-sm text-center">
                                                        {renderDeploymentStatus(childDeployment.status as DeploymentStatus)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};