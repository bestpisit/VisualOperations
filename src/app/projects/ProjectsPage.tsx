'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProjectCard from './ProjectCard';
import SearchBar from '@/components/SearchBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from '@/lib/context/AppContext';
import { handleApiError } from '@/types/api/apiError';
import { Project } from '@prisma/client';

const ProjectsPage = ({ projects }: { projects: Project[] }) => {
    const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(''); // State for search query
    const { setProjects: setNProjects } = useAppContext();

    // Fetch projects on client-side
    useEffect(() => {
        setNProjects(projects); // Set global projects
    }, [projects]);

    const debounce = (func: (...args: any[]) => void, delay: number) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Debounced search function to improve performance
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            if (query.trim()) {
                const filtered = projects.filter((project) =>
                    project.name.toLowerCase().includes(query.toLowerCase())
                );
                setFilteredProjects(filtered);
            } else {
                setFilteredProjects(projects); // Reset to all projects if query is empty
            }
        }, 0),
        [projects]
    );

    // Handle input change and trigger the debounced search
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    // Clear the search box
    const handleClearSearch = () => {
        setSearchQuery('');
        setFilteredProjects(projects); // Reset to all projects
    };

    const handleCreateProject = async () => {
        setIsModalOpen(false);
        if (!projectName.trim() || !projectDescription.trim()) {
            toast.error('Please fill out both the project name and description.');
            return;
        }

        const toastId = toast.loading('Creating project...');

        try {
            const { data } = await axios.post(`/api/projects/create`, {
                name: projectName,
                description: projectDescription,
            });

            // Update all project states
            setNProjects([...projects, data]);  // Update global projects
            setFilteredProjects([...projects, data]);  // Update filtered projects

            // Reset form and close modal
            setProjectName('');
            setProjectDescription('');
            setIsModalOpen(false);

            // Update toast on success
            toast.update(toastId, {
                render: 'Project created successfully!',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });
        } catch (error: any) {
            // Update toast on error
            toast.update(toastId, {
                render: handleApiError(error) || 'Error creating project. Please try again.',
                type: 'error',
                isLoading: false,
                autoClose: 4000,
            });
        }
    };

    return (
        <div className={`flex-grow w-full h-full bg-secondary-100 flex flex-col overflow-auto`}>
            <div className="flex justify-items-start p-4 py-0 bg-white rounded-lg h-[80px] min-h-[80px] max-h-[80px]">
                <h1 className="font-bold text-2xl text-slate-800 text-center my-auto ml-3">Projects</h1>
                <div className='mx-auto flex w-[400px]'>
                    <SearchBar
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e)}
                        onClear={handleClearSearch} // Optional clear functionality
                        placeholder="Search projects..." // Optional custom placeholder
                    />
                </div>
            </div>

            <div className="flex-grow w-full h-full flex-col flex overflow-auto shadow-inner bg-dots-pattern pt-4">
                {filteredProjects.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        <div className='flex w-full h-full justify-center'>
                            <div
                                className="w-64 h-64 bg-secondary-100 shadow-lg rounded-lg p-4 flex flex-col justify-center items-center hover:bg-secondary-200 cursor-pointer transition duration-300 ease-in-out"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <h2 className="text-xl font-bold text-gray-700">Create Project</h2>
                                <div className="text-6xl text-gray-500 mt-4">+</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="container grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        <div className='flex w-full h-full justify-center'>
                            <div
                                className="w-64 h-64 shadow-secondary-200 border border-secondary-200 bg-secondary-100 shadow-lg rounded-lg p-4 flex flex-col justify-center items-center hover:bg-secondary-200 cursor-pointer transition duration-300 ease-in-out"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <h2 className="text-xl font-bold text-gray-700">Create Project</h2>
                                <div className="text-6xl text-gray-500 mt-4">+</div>
                            </div>
                        </div>
                        {filteredProjects?.map((project) => (
                            <div className='flex w-full h-full justify-center' key={project.id}>
                                <ProjectCard id={project.id} uuid={project.uuid} name={project.name} description={project.description} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>Enter project details below to create a new project.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Project Name"
                        />
                        <Textarea
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            placeholder="Project Description"
                            rows={4}
                        />
                    </div>
                    <DialogFooter className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateProject}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectsPage;
