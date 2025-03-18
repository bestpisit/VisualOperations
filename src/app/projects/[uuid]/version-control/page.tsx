'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useProjectContext } from '@/lib/context/ProjectContext';
import { CirclePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github } from "lucide-react";
import { useRouter } from 'next-nprogress-bar';
import { ROUTES } from '@/lib/route';

export default function ProjectSettingsPage() {
    const router = useRouter();
    const { project, isConnectToGit, setIsConnectToGit } = useProjectContext();
    interface Version {
        id: string;
        versionNumber: string;
        description: string;
        createdAt: string;
    }

    const [versions, setVersions] = useState<Version[]>([]);
    const [, setIsVersionLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [newRepoName, setNewRepoName] = useState('');

    // Mock version data
    useEffect(() => {
        if (isConnectToGit) {
            const mockVersions = [
                { id: '1', versionNumber: 'v1', description: 'Setup Infrastructure', createdAt: '2024-01-01' },
                { id: '2', versionNumber: 'v2', description: 'Setup Application', createdAt: '2024-02-15' },
                { id: '3', versionNumber: 'v3', description: 'Scale Todo Platform', createdAt: '2024-03-10' },
                { id: '4', versionNumber: 'v4', description: 'Rollback Version to v2', createdAt: '2024-04-20' },
                { id: '5', versionNumber: 'v5', description: 'Setup Nginx Reverse Proxy', createdAt: '2024-04-20' }
            ];
            mockVersions.reverse();
            setVersions(mockVersions);
        }
        setIsVersionLoading(false);
    }, [isConnectToGit]);

    const handleRevertVersion = (versionId: string) => {
        toast.success(`Reverted to version ${versionId}`);
        // Mock reverting action
    };

    const handleConnectToGithub = () => {
        setIsOpen(true);
    };

    const handleCreateRepo = () => {
        if (newRepoName.trim() === '') {
            toast.error('Repository name cannot be empty');
            return;
        }

        // Mock connecting to GitHub (setting up the repository)
        setIsConnectToGit(true);
        setIsOpen(false);
        toast.success(`Connected to GitHub repository: ${newRepoName}`);
    };

    return (
        <div className='border-l flex-grow flex flex-col'>
            {/* Action Bar */}
            <div className="bg-slate-50 px-4 py-2 flex justify-between items-center space-x-4 border-b">
                <div className="flex space-x-2">
                    {!isConnectToGit && (
                        <button
                            className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                            onClick={handleConnectToGithub}
                        >
                            <CirclePlus className="w-5 h-5" />
                            <span>Connect To Github</span>
                        </button>
                    )}
                    {
                        isConnectToGit && (
                            <button
                                className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                            >
                                <a href="https://github.com/bestpisit/VisOps" target="_blank" rel="noopener noreferrer" className='flex'>
                                    <Github className="w-5 h-5 mr-2" />
                                    <span>View GitHub Repository</span>
                                </a>
                            </button>
                        )
                    }
                </div>
            </div>

            {/* Version Control Table */}
            {isConnectToGit && (
                <>
                    <div className="bg-slate-50 px-4 py-4 border-b">
                        <h1 className="text-xl font-bold">Version Control</h1>
                    </div>

                    <div className="p-6">
                        <table className="min-w-full bg-white border rounded-md">
                            <thead>
                                <tr>
                                    <th className="py-2 px-4 border-b">Version</th>
                                    <th className="py-2 px-4 border-b">Description</th>
                                    <th className="py-2 px-4 border-b">Created At</th>
                                    <th className="py-2 px-4 border-b">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {versions.length > 0 ? (
                                    versions.map((version, index) => (
                                        <tr key={version.id} className={`${index === 0 ? 'bg-green-200' : ''}`}>
                                            <td className="py-2 px-4 border-b">{version.versionNumber}</td>
                                            <td className="py-2 px-4 border-b break-words">{version.description || 'No description'}</td>
                                            <td className="py-2 px-4 border-b">{new Date(version.createdAt).toLocaleDateString()}</td>
                                            <td className="py-2 px-4 border-b flex justify-center gap-2">
                                                {index > 0 && <button
                                                    onClick={() => handleRevertVersion(version.versionNumber)}
                                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Rollback
                                                </button>}
                                                <button
                                                    onClick={() => router.push(ROUTES.PROJECT_VERSION(project.id, version.versionNumber))} // Change this to the correct route
                                                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/projects/project/${project.name}/deployments`)}
                                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                >
                                                    View Deployment
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-4 text-center">No versions available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Setup GitHub <Github />
                        </DialogTitle>
                    </DialogHeader>

                    <Input
                        type="text"
                        placeholder="Enter new repository name"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        className="w-full"
                    />

                    <DialogFooter className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateRepo}>
                            Create Repository
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};