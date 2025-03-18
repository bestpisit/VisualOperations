'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useProjectContext } from '@/lib/context/ProjectContext';
import { useRouter } from 'next-nprogress-bar';
import { useParams } from 'next/navigation';
import { ROUTES } from '@/lib/route';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppContext } from '@/lib/context/AppContext';

export default function ProjectSettingsPage() {
    const router = useRouter();
    const { rproject, setProject } = useProjectContext(); // Access project data and setter from context
    const { setProjects } = useAppContext();
    const [name, setName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { uuid } = useParams();

    useEffect(()=>{
        if (rproject) {
            setName(rproject.name);
            setDescription(rproject.description || '');
        }
    },[rproject]);

    // Handle project information update
    const handleUpdateProject = async () => {
        setIsSaving(true);
        try {
            await axios.put(`/api/projects/${uuid}`, {
                name,
                description,
            });
            setProject((proj) => ({ ...proj, name, description })); // Update project in context
            setProjects((projects) => {
                if (!projects) return projects;
                return projects.map((proj) => {
                    if (proj.uuid === uuid) {
                        return { ...proj, name, description };
                    }
                    return proj;
                });
            });
            toast.success('Project updated successfully');
        } catch {
            toast.error('Failed to update project');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle project deletion
    const handleDeleteProject = async () => {
        setIsDeleting(true);
        try {
            await axios.delete(`/api/projects/${uuid}`);
            setProjects((projects) => {
                if (!projects) return projects;
                return projects.filter((proj) => proj.uuid !== uuid);
            });
            toast.success('Project deleted successfully');
            router.push(ROUTES.PROJECTS);
        } catch {
            toast.error('Failed to delete project');
        } finally {
            setIsDeleting(false);
            setIsModalOpen(false);
        }
    };

    return (
        <div className='border-l flex-grow flex flex-col'>
            <div className="bg-slate-50 px-4 py-4 border-b">
                <h1 className="text-xl font-bold">Project Settings</h1>
            </div>

            {/* Project Settings Form */}
            <div className="p-6">
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Project Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter project name"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Project Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter project description"
                        rows={4}
                    />
                </div>
                <button
                    onClick={handleUpdateProject}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Delete Project Button */}
            <div className="p-6">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Delete Project
                </button>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                    </DialogHeader>

                    <p>Are you sure you want to delete the project? This action cannot be undone.</p>

                    <DialogFooter className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteProject}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};