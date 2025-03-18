'use client';
import { useResourceContext } from '@/lib/context/ResourceContext';
import { Cpu, Server, Globe, HardDrive, Network, ChevronDown } from 'lucide-react'; // Importing Lucide icons
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

const ResourceDetail = () => {
    const {resource} = useResourceContext();

    const { id } = useParams();

    const fetchResource = async () => {
        try {
            const response = await fetch(`/api/resources/${id}`);
            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(()=>{
        fetchResource();
    },[]);

    return (
        <div className="flex-grow w-full h-full bg-white flex flex-col overflow-auto p-4 pt-0 space-y-6">
            {/* Essentials Section */}
            <div className="bg-white space-y-4 border-b pb-4">
                <h2 className="text-lg font-bold pt-2 flex gap-2">Essentials<ChevronDown className='text-gray-600' /></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Resource Name:</p>
                        <p>{resource?.name}</p>
                    </div>
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Status:</p>
                        <p className="text-green-500">{(resource as any)?.status}</p>
                    </div>
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">IP Address:</p>
                        <p>{(resource as any)?.details?.endpoint?.value}</p>
                    </div>
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Gateway:</p>
                        <p>{(resource as any)?.details?.vm_gateway?.value}</p>
                    </div>
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Subnet:</p>
                        <p>{(resource as any)?.details?.vm_cidr?.value}</p>
                    </div>
                </div>
            </div>

            <div className='grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4'>
                {/* Properties Section */}
                <div className="bg-slate-50 shadow-md p-4 rounded-md">
                    <h2 className="text-lg font-bold pb-2 border-b mb-2">Properties</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                        {/* CPU Configuration */}
                        <div className="flex items-center space-x-3">
                            <Cpu className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">CPU</p>
                                <p>{(resource as any)?.details?.cpu?.value}</p>
                            </div>
                        </div>
                        {/* Memory Configuration */}
                        <div className="flex items-center space-x-3">
                            <HardDrive className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">Memory</p>
                                <p>{(resource as any)?.details?.memory?.value}</p>
                            </div>
                        </div>
                        {/* Storage Configuration */}
                        <div className="flex items-center space-x-3">
                            <Server className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">Storage</p>
                                <p>{(resource as any)?.details?.storage?.value}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Networking Section */}
                <div className="bg-slate-50 shadow-md p-4 rounded-md">
                    <h2 className="text-lg font-bold pb-2 border-b mb-2">Networking</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                        <div className="flex items-center space-x-3">
                            <Network className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">IP Address</p>
                                <p>{(resource as any)?.details?.endpoint?.value}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Globe className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">Subnet</p>
                                <p>{(resource as any)?.details?.vm_cidr?.value}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hosting Section */}
                {/* <div className="bg-slate-50 shadow-md p-4 rounded-md">
                    <h2 className="text-lg font-bold pb-2 border-b mb-2">Hosting</h2>
                    <div className="flex items-center space-x-3 text-base">
                        <Code className="text-blue-500 w-6 h-6" />
                        <div>
                            <p className="font-semibold">Operating System</p>
                            <p>{resource.details.operatingSystem}</p>
                        </div>
                    </div>
                </div> */}
            </div>

        </div>
    );
};

export default ResourceDetail;