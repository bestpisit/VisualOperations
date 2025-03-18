'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { Resource } from '@prisma/client';
import { useParams } from 'next/navigation';
import axios from 'axios';

// Define the shape of the context
interface ResourceContextType {
    resource: Resource|null;
    setResource: React.Dispatch<React.SetStateAction<Resource|null>>;
    loading: boolean;
}

// Create the context
const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

// Context provider component
export const ResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [resource, setResource] = useState<Resource|null>(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams() || {};

    // Fetch resource data when layout is mounted
    useEffect(() => {
        if (!id) return; // Prevent fetching if no ID is present

        const fetchResource = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`/api/resources/${id}`);
                // const data: Resource = {
                //     uuid: "1",
                //     deploymentId: "1",
                //     name: 'vm-gateway',
                //     type: 'Nutanix Virtual Machine',
                //     description: 'This is a Nutanix virtual machine that acts as a gateway for the Workspace network.',
                //     details: {
                //         status: 'Active',
                //         operatingSystem: 'Ubuntu 20.04 LTS',
                //         network: {
                //             ipAddress: '10.10.183.23',
                //             gateway: '10.10.183.1',
                //             subnet: '10.10.183.0/24',
                //         },
                //         configuration: {
                //             cpu: '4 vCPUs',
                //             memory: '16 GB',
                //             storage: '500 GB',
                //         }
                //     },
                //     tags: [],
                //     config: {},
                //     createdAt: new Date(),
                //     updatedAt: new Date(),
                // };
                setResource(data);
            } catch {
                console.error('Failed to fetch resource data');
            } finally {
                setLoading(false);
            }
        };

        fetchResource();
    }, [id]);

    return (
        <ResourceContext.Provider value={{ resource, setResource, loading }}>
            {children}
        </ResourceContext.Provider>
    );
};

// Custom hook to use the ResourceContext
export const useResourceContext = () => {
    const context = useContext(ResourceContext);
    if (!context) {
        throw new Error('useResourceContext must be used within a ResourceProvider');
    }
    return context;
};