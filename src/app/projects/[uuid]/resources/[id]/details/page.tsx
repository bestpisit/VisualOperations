'use client';

import { useResourceContext } from "@/lib/context/ResourceContext";
import { TerraformOutputField } from "@/types/PlatformStructure";
import { ChevronDown } from "lucide-react";

const ResourceDetailsPage = () => {
    const { resource } = useResourceContext();
    const resourceDetails = resource?.details as TerraformOutputField | null;
    return (
        <div className="flex-grow w-full h-full bg-white flex flex-col overflow-auto p-4 pt-0 space-y-6">
            {/* Essentials Section */}
            <div className="bg-white space-y-4 border-b pb-4">
                <h2 className="text-lg font-bold pt-2 flex gap-2">Details<ChevronDown className='text-gray-600' /></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base">
                    <div className='flex gap-4 justify-items-center items-center'>
                        <p className="font-semibold">Resource Name:</p>
                        <p>{resource?.name}</p>
                    </div>
                    {
                        resourceDetails && Object.entries(resourceDetails).map(([key, value], index) => (
                            <div key={index} className='flex gap-4 justify-items-center items-center'>
                                <p className="font-semibold">{key}</p>
                                <p>{value.value}</p>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    )
}

export default ResourceDetailsPage