'use client';
import { Cpu, Server, Globe, HardDrive, Network, Save, ChevronDown } from 'lucide-react'; // Importing Lucide icons
import { useState } from 'react';

const ResourceConfiguration = () => {
    const [resource, setResource] = useState({
        id: 1,
        name: 'vm-vaultwarden',
        type: 'Proxmox Virtual Machine',
        details: {
            status: 'Active',
            operatingSystem: 'Ubuntu 20.04 LTS',
            network: {
                ipAddress: '10.10.183.23',
                gateway: '10.10.183.1',
                subnet: '10.10.183.0/24',
            },
            configuration: {
                cpu: '4 vCPUs',
                memory: '16 GB',
                storage: '500 GB',
            },
        },
    });

    const handleSave = () => {
        // Logic to save configuration (e.g., update API call)
        console.log('Configuration saved', resource);
    };

    const handleInputChange = (key: string, value: string) => {
        setResource((prevState) => ({
            ...prevState,
            details: {
                ...prevState.details,
                configuration: {
                    ...prevState.details.configuration,
                    [key]: value,
                },
            },
        }));
    };

    return (
        <div className="flex-grow w-full h-full bg-white flex flex-col overflow-auto p-4 pt-0 space-y-6">
            {/* Essentials Section */}
            <div className="bg-white space-y-4 border-b pb-4">
                <h2 className="text-lg font-bold pt-2 flex gap-2">Configuration<ChevronDown className='text-gray-600' /></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Resource Name:</p>
                        <p>{resource.name}</p>
                    </div>
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Status:</p>
                        <p className="text-green-500">{resource.details.status}</p>
                    </div>
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Operating System:</p>
                        <p>{resource.details.operatingSystem}</p>
                    </div>
                </div>
            </div>

            <div className='grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4'>
                {/* Configuration Section */}
                <div className="bg-white shadow-md p-4 rounded-md">
                    <h2 className="text-lg font-bold pb-2 border-b mb-2">Resource Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                        {/* CPU Configuration */}
                        <div className="flex items-center space-x-3">
                            <Cpu className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">CPU</p>
                                <input
                                    type="text"
                                    value={resource.details.configuration.cpu}
                                    onChange={(e) => handleInputChange('cpu', e.target.value)}
                                    className="border rounded p-2 w-full"
                                />
                            </div>
                        </div>
                        {/* Memory Configuration */}
                        <div className="flex items-center space-x-3">
                            <HardDrive className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">Memory</p>
                                <input
                                    type="text"
                                    value={resource.details.configuration.memory}
                                    onChange={(e) => handleInputChange('memory', e.target.value)}
                                    className="border rounded p-2 w-full"
                                />
                            </div>
                        </div>
                        {/* Storage Configuration */}
                        <div className="flex items-center space-x-3">
                            <Server className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">Storage</p>
                                <input
                                    type="text"
                                    value={resource.details.configuration.storage}
                                    onChange={(e) => handleInputChange('storage', e.target.value)}
                                    className="border rounded p-2 w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Networking Section */}
                <div className="bg-white shadow-md p-4 rounded-md">
                    <h2 className="text-lg font-bold pb-2 border-b mb-2">Networking</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                        <div className="flex items-center space-x-3">
                            <Network className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">IP Address</p>
                                <input
                                    type="text"
                                    value={resource.details.network.ipAddress}
                                    className="border rounded p-2 w-full"
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Globe className="text-blue-500 w-6 h-6" />
                            <div>
                                <p className="font-semibold">Subnet</p>
                                <input
                                    type="text"
                                    value={resource.details.network.subnet}
                                    className="border rounded p-2 w-full"
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    className="bg-blue-500 text-white fixed bottom-4 font-semibold py-2 px-6 rounded flex items-center gap-2 hover:bg-blue-600"
                >
                    <Save className="w-5 h-5" />
                    Save Configuration
                </button>
            </div>
        </div>
    );
};

export default ResourceConfiguration;