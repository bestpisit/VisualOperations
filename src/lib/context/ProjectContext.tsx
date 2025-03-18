'use client';
import { createContext, useContext, useState } from 'react';
import { CustomProject } from '@/app/api/projects/[projectUUID]/function';

// Define the shape of the context
interface ProjectContextType {
    project: CustomProject;
    rproject: CustomProject;
    setProject: React.Dispatch<React.SetStateAction<CustomProject>>;
    isConnectToGit: boolean;
    setIsConnectToGit: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create the context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Context provider component
export const ProjectProvider: React.FC<{ children: React.ReactNode, project: CustomProject }> = ({ children, project }) => {
    const [rproject, setProject] = useState<CustomProject>(project);
    const [isConnectToGit, setIsConnectToGit] = useState(false);

    return (
        <ProjectContext.Provider value={{ project, rproject, setProject, isConnectToGit, setIsConnectToGit }}>
            {children}
        </ProjectContext.Provider>
    );
};

// Custom hook to use the ProjectContext
export const useProjectContext = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjectContext must be used within a ProjectProvider');
    }
    return context;
};