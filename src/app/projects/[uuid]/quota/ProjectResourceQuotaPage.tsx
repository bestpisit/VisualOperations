'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { Edit } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useSession } from 'next-auth/react';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import { ImageInventory } from '@/images/ImageInventory';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectResourceQuota } from '@prisma/client';
import { ProjectResourceQuotaType } from '@/types/PlatformStructure';
import { ResourceQuotaUsageCustom } from './page';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Register chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ProjectResourceQuotaPage({ projectResourceQuota, resourceQuotaUsages }: { projectResourceQuota: ProjectResourceQuota, resourceQuotaUsages: ResourceQuotaUsageCustom[] }) {
    const { data: session } = useSession();

    const [resources, ] = useState<ResourceQuotaUsageCustom[]>(resourceQuotaUsages);

    const [quotaData, setQuotaData] = useState<ProjectResourceQuotaType>(projectResourceQuota.quotas as ProjectResourceQuotaType);
    const [usageData, ] = useState<ProjectResourceQuotaType>(projectResourceQuota.usage as ProjectResourceQuotaType);

    const [chartColors,] = useState({
        used: '#4F46E5', // Purple
        available: '#E5E7EB' // Gray
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newQuota, setNewQuota] = useState({
        cpu: quotaData.cpu,
        memory: quotaData.memory,
        storage: quotaData.storage
    });

    // Prepare data for charts
    const prepareChartData = (used: number, max: number) => ({
        datasets: [
            {
                data: [used, max - used],
                backgroundColor: [chartColors.used, chartColors.available],
                hoverBackgroundColor: [chartColors.used, chartColors.available],
                borderWidth: 1
            }
        ],
        labels: ['Used', 'Available']
    });

    const [pending, setPending] = useState(false);

    const handleOpenModal = () => {
        if (session?.user?.role === RoleTypes.Admin || session?.user?.role === RoleTypes.SuperAdmin) {
            setNewQuota({
                cpu: quotaData.cpu,
                memory: quotaData.memory,
                storage: quotaData.storage
            });
            setIsModalOpen(true);
        }
        else {
            setIsModalOpen(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleQuotaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewQuota({
            ...newQuota,
            [name]: parseInt(value, 10)
        });
    };

    const router = useRouter();

    const handleSaveQuota = async () => {
        setPending(true);
        const updatePromise = axios.patch(`/api/projects/${projectResourceQuota.projectId}/quota`, {
            quotas: newQuota
        });
    
        toast.promise(updatePromise, {
            pending: 'Updating quota...',
            success: 'Quota updated successfully!',
            error: 'Failed to update quota'
        });
    
        try {
            await updatePromise;
            setQuotaData(newQuota);
            setIsModalOpen(false);
            router.refresh();
        } catch (error) {
            console.error('Quota update failed:', error);
        } finally {
            setPending(false);
        }
    };    

    return (
        <div className='border-l flex-grow flex flex-col'>
            {/* Action Bar */}
            <div className="bg-slate-50 px-4 py-2 flex justify-start items-center space-x-4 border-b">
                <button
                    onClick={handleOpenModal}
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                >
                    <Edit className="w-5 h-5" />
                    <span>Set Quota</span>
                </button>
            </div>

            {/* Quota Charts */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
                <div className="bg-white p-4 shadow rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">cpu Usage</h3>
                    <Doughnut data={prepareChartData(usageData.cpu, quotaData.cpu)} />
                    <div className="text-center mt-2">
                        {usageData.cpu} / {quotaData.cpu} cpus used
                    </div>
                    <div className='mt-10'>
                        <div className='text-center font-bold text-lg'>
                            cpu Usage by Resource
                        </div>
                        {
                            resources.map((resource, index) => {
                                if (resource.usage.cpu === undefined) return null;
                                return (
                                    <div key={index} className='flex items-center justify-between space-x-2 mt-2'>
                                        <div className='flex gap-2'>
                                            {
                                                [ImageInventory.Icon.Server].map((icon, idx) => (
                                                    <Image
                                                        key={idx}
                                                        width={25}
                                                        height={25}
                                                        src={icon}
                                                        alt={''}
                                                    />
                                                ))
                                            }
                                            <span>{resource.resource.name}</span>
                                        </div>
                                        <div>
                                            {resource.usage.cpu} cpus
                                        </div>
                                        <div>
                                            {100 * (resource.usage.cpu / usageData.cpu)}%
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
                <div className="bg-white p-4 shadow rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">memory Usage</h3>
                    <Doughnut data={prepareChartData(usageData.memory, quotaData.memory)} />
                    <div className="text-center mt-2">
                        {usageData.memory} / {quotaData.memory} MB used
                    </div>
                    <div className='mt-10'>
                        <div className='text-center font-bold text-lg'>
                            memory Usage by Resource
                        </div>
                        {
                            resources.map((resource, index) => {
                                if (resource.usage.memory === undefined) return null;
                                return (
                                    <div key={index} className='flex items-center justify-between space-x-2 mt-2'>
                                        <div className='flex gap-2'>
                                            {
                                                [ImageInventory.Icon.Server].map((icon, idx) => (
                                                    <Image
                                                        key={idx}
                                                        width={25}
                                                        height={25}
                                                        src={icon}
                                                        alt={''}
                                                    />
                                                ))
                                            }
                                            <span>{resource.resource.name}</span>
                                        </div>
                                        <div>
                                            {resource.usage.memory} MiB
                                        </div>
                                        <div>
                                            {100 * (resource.usage.memory / usageData.memory)}%
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
                <div className="bg-white p-4 shadow rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">storage Usage</h3>
                    <Doughnut data={prepareChartData(usageData.storage, quotaData.storage)} />
                    <div className="text-center mt-2">
                        {usageData.storage} / {quotaData.storage} GB used
                    </div>
                    <div className='mt-10'>
                        <div className='text-center font-bold text-lg'>
                            storage Usage by Resource
                        </div>
                        {
                            resources.map((resource, index) => {
                                if (resource.usage.storage === undefined) return null;
                                return (
                                    <div key={index} className='flex items-center justify-between space-x-2 mt-2'>
                                        <div className='flex gap-2'>
                                            {
                                                [ImageInventory.Icon.Server].map((icon, idx) => (
                                                    <Image
                                                        key={idx}
                                                        width={25}
                                                        height={25}
                                                        src={icon}
                                                        alt={''}
                                                    />
                                                ))
                                            }
                                            <span>{resource.resource.name}</span>
                                        </div>
                                        <div>
                                            {resource.usage.storage} GiB
                                        </div>
                                        <div>
                                            {100 * (resource.usage.storage / usageData.storage)}%
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Quota</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">cpu Quota</label>
                            <Input
                                type="number"
                                name="cpu"
                                value={newQuota.cpu}
                                onChange={handleQuotaChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">memory Quota (MB)</label>
                            <Input
                                type="number"
                                name="memory"
                                value={newQuota.memory}
                                onChange={handleQuotaChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">storage Quota (GB)</label>
                            <Input
                                type="number"
                                name="storage"
                                value={newQuota.storage}
                                onChange={handleQuotaChange}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveQuota} disabled={pending}>
                            {
                                pending ? 'Saving...' : 'Save'
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};