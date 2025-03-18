'use client';
import Breadcrumb from "@/components/layout/Breadcrumb";
import { ImageInventory } from "@/images/ImageInventory";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from 'next/image';

// Register chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Mock Data
const mockProjects = [
    { name: 'Project A', activeResources: 5, inactiveResources: 2 },
    { name: 'Project B', activeResources: 8, inactiveResources: 1 },
    { name: 'Project C', activeResources: 2, inactiveResources: 5 },
];

const resourceUsage = {
    vCPU: { used: 20, max: 50 }, // in units
    RAM: { used: 80, max: 200 }, // in GB
    Storage: { used: 500, max: 1024 }, // in GB
};

const providersHealth = [
    { name: 'CPE-Proxmox', status: 'Healthy', icons: [ImageInventory.Icon.Proxmox] },
    { name: 'CPE-Nutanix', status: 'Healthy', icons: [ImageInventory.Icon.Nutanix] },
    { name: 'Docker VM-Backend Host', status: 'Warning', icons: [ImageInventory.Icon.Docker] },
    { name: 'Docker VM-Gateway Host', status: 'Healthy', icons: [ImageInventory.Icon.Docker] },
];

const DashboardPage = () => {
    const { data: session } = useSession();
    const [projectStats, setProjectStats] = useState({ total: 0, activeResources: 0, inactiveResources: 0 });

    useEffect(() => {
        // Calculate total projects, active, and inactive resources
        const totalProjects = mockProjects.length;
        const activeResources = mockProjects.reduce((acc, project) => acc + project.activeResources, 0);
        const inactiveResources = mockProjects.reduce((acc, project) => acc + project.inactiveResources, 0);
        setProjectStats({ total: totalProjects, activeResources, inactiveResources });
    }, []);

    // Prepare data for resource usage graphs
    const prepareResourceChartData = (used: number, max: number, label: string) => ({
        labels: [label],
        datasets: [
            {
                label: 'Used',
                data: [used],
                backgroundColor: 'linear-gradient(90deg, rgba(79,70,229,1) 0%, rgba(67,56,202,1) 100%)',
                borderColor: '#4F46E5',
                borderWidth: 1,
            },
            {
                label: 'Available',
                data: [max - used],
                backgroundColor: '#E5E7EB',
                borderColor: '#E5E7EB',
                borderWidth: 1,
            },
        ],
    });

    const TechnologyStackGrid = () => {
        const technologies = [
            { name: 'PostgreSQL', icon: ImageInventory.Icon.PostgreSQL },
            { name: 'Redis', icon: ImageInventory.Icon.Redis },
            { name: 'Docker', icon: ImageInventory.Icon.Docker },
            { name: 'Server', icon: ImageInventory.Icon.Server },
            { name: 'Nginx', icon: ImageInventory.Icon.Nginx },
            { name: 'Terraform', icon: ImageInventory.Icon.Terraform },
            { name: 'Nutanix', icon: ImageInventory.Icon.Nutanix },
            { name: 'Proxmox', icon: ImageInventory.Icon.Proxmox },
        ];

        return (
            <div className="bg-white p-6 rounded-lg shadow-md flex-grow">
                <h3 className="text-xl font-semibold mb-4">Projects Technology Stack</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {technologies.map((tech, index) => (
                        <div key={index} className="flex flex-col items-center space-y-2">
                            <Image src={tech.icon} alt={tech.name} width={50} height={50} />
                            <span className="text-sm font-medium text-gray-700">{tech.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-8 flex flex-grow flex-col">
            <Breadcrumb>
                <div className="text-base">
                    Dashboard
                </div>
            </Breadcrumb>
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold">Welcome, {session?.user?.name || 'User'}!</h2>
                <p className="mt-2">Glad to have you back in the VisualOperation Platform.</p>
            </div>

            {/* Project Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md flex">
                    <div className='flex-grow'>
                        <h3 className="text-xl font-semibold mb-4">Project Overview</h3>
                        <div className="space-y-2">
                            <div className="text-gray-600">Total Projects: <span className="font-bold">{projectStats.total}</span></div>
                            <div className="text-green-600">Active Resources: <span className="font-bold">{projectStats.activeResources}</span></div>
                            <div className="text-red-600">Inactive Resources: <span className="font-bold">{projectStats.inactiveResources}</span></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md col-span-2">
                    <h3 className="text-xl font-semibold mb-4 text-center">Resource Usage Graph</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <Bar data={prepareResourceChartData(resourceUsage.vCPU.used, resourceUsage.vCPU.max, 'vCPU')} />
                            <div className="text-center mt-2">
                                {resourceUsage.vCPU.used} / {resourceUsage.vCPU.max} vCPUs used
                            </div>
                        </div>
                        <div>
                            <Bar data={prepareResourceChartData(resourceUsage.RAM.used, resourceUsage.RAM.max, 'RAM')} />
                            <div className="text-center mt-2">
                                {resourceUsage.RAM.used} / {resourceUsage.RAM.max} GB used
                            </div>
                        </div>
                        <div>
                            <Bar data={prepareResourceChartData(resourceUsage.Storage.used, resourceUsage.Storage.max, 'Storage')} />
                            <div className="text-center mt-2">
                                {resourceUsage.Storage.used} / {resourceUsage.Storage.max} GB used
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='flex flex-grow gap-10 sm:flex-col flex-col md:flex-row lg:flex-row xl:flex-row'>
                {/* Providers Health */}
                <div className="bg-white p-6 rounded-lg shadow-md flex-grow">
                    <h3 className="text-xl font-semibold mb-4">Projects Providers Health</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {providersHealth.map((provider, index) => (
                            <div key={index} className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    {provider.icons.map((icon, idx) => (
                                        <Image key={idx} width={40} height={40} src={icon} alt={provider.name} />
                                    ))}
                                </div>
                                <div>
                                    <div className="text-lg font-bold">{provider.name}</div>
                                    <div className={`text-sm ${provider.status === 'Healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {provider.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className='flex-grow flex'>
                    <TechnologyStackGrid />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;