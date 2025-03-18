import { ResourceProvider } from '@/lib/context/ResourceContext'
import React, { ReactNode } from 'react'
import ResourceLayout from './ResourceLayout';

interface ResourceLayoutProps {
    children: ReactNode;
}

const layout: React.FC<ResourceLayoutProps> = ({ children }) => {
    return (
        <ResourceProvider>
            <ResourceLayout>
                {children}
            </ResourceLayout>
        </ResourceProvider>
    )
}

export default layout