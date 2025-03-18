'use client';

import { useEffect, useState } from 'react';
import { CirclePlus } from 'lucide-react';
import { Provider } from '@prisma/client';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { RoleTypes } from '@/types/prisma/RBACTypes';

export default function ProvidersPage() {
    const [projectProviders, setProjectProviders] = useState<Provider[]>([]);
    const [allProviders, setAllProviders] = useState<Provider[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
    const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const { uuid } = useParams();
    const { data: session } = useSession();

    // Dialog open/close state
    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {
        fetchProjectProviders();
    }, []);

    // Fetch existing providers for the current project
    const fetchProjectProviders = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/projects/${uuid}/providers`);
            setProjectProviders(res.data);
        } catch (error) {
            console.error('Error fetching project providers:', error);
            toast.error('Failed to load project providers.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch all available providers (for selection in the import dialog)
    const fetchAllProviders = async () => {
        try {
            const res = await axios.get('/api/providers');
            setAllProviders(res.data);
            // If you want to default to the first option in the list
            // setSelectedProviderId(res.data[0]?.id ?? null);
        } catch (error) {
            console.error('Error fetching all providers:', error);
            toast.error('Failed to load provider list for import.');
        }
    };

    // Handle "Import Provider" (PUT request)
    const handleImport = async () => {
        if (!selectedProviderId) {
            toast.warn('Please select a provider to import.');
            return;
        }

        const importPromise = axios.post(`/api/projects/${uuid}/providers`, {
            providerId: selectedProviderId,
        });

        toast.promise(importPromise, {
            pending: 'Importing provider...',
            success: 'Provider imported successfully!',
            error: 'Failed to import provider.',
        });

        try {
            await importPromise;
            // Refresh the list of project providers
            fetchProjectProviders();

            // Close the dialog and reset the selection
            setOpenDialog(false);
            setSelectedProviderId(null);
        } catch (error) {
            console.error('Error importing provider:', error);
        }
    };

    // Handle deleting a provider from the project
    const handleDelete = async () => {
        if (!selectedDeleteId) {
            toast.warn('Please select a provider to delete.');
            return;
        }
        const deletePromise = axios.delete(`/api/projects/${uuid}/providers/${selectedDeleteId}`);

        toast.promise(deletePromise, {
            pending: 'Removing provider...',
            success: 'Provider removed successfully!',
            error: 'Failed to remove provider.',
        });

        try {
            await deletePromise;
            // Refresh the list
            setSelectedDeleteId(null);
            fetchProjectProviders();
        } catch (error) {
            console.error('Error deleting provider:', error);
        }
    };

    if (loading) {
        return <div className="text-center py-4">Loading...</div>;
    }

    return (
        <div className="border-l flex-grow flex flex-col">
            {/* Action Bar */}
            <div className="bg-slate-50 px-4 py-2 flex justify-start items-center space-x-4 border-b">
                {(session?.user?.role === RoleTypes.Admin || session?.user?.role === RoleTypes.SuperAdmin) && (
                    <Dialog
                        open={openDialog}
                        onOpenChange={(isOpen) => {
                            setOpenDialog(isOpen);
                            if (isOpen) {
                                fetchAllProviders();
                            } else {
                                setSelectedProviderId(null);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                            >
                                <CirclePlus className="w-5 h-5 mr-1" />
                                <span>Import Provider</span>
                            </Button>
                        </DialogTrigger>

                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Import an Existing Provider</DialogTitle>
                                <DialogDescription>
                                    Select an existing provider from the list below to import into this project.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="flex flex-col space-y-1.5">
                                    <label className="text-sm font-medium" htmlFor="provider-select">
                                        Provider
                                    </label>
                                    <select
                                        id="provider-select"
                                        className="border rounded p-2"
                                        value={selectedProviderId ?? ''}
                                        onChange={(e) => setSelectedProviderId(Number(e.target.value))}
                                    >
                                        <option value="" disabled>
                                            -- Select a provider --
                                        </option>
                                        {allProviders.filter(provider=>!projectProviders.find(pp=>pp.id===provider.id)).map((prov) => (
                                            <option key={prov.id} value={prov.id}>
                                                {prov.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleImport}>Import</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="bg-slate-50 px-4 py-4 border-b">
                <h1 className="text-xl font-bold">Providers</h1>
            </div>

            <div className="p-0 overflow-auto">
                <table className="min-w-full bg-white border">
                    <thead>
                        <tr>
                            <th className="py-2 px-2 border-b-2">ID</th>
                            <th className="py-2 border-b-2">Name</th>
                            <th className="py-2 border-b-2">Description</th>
                            <th className="py-2 border-b-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projectProviders.map((provider) => (
                            <tr
                                key={provider.id}
                                className="hover:bg-gray-100 border-b max-h-[40px] min-h-[40px] h-[40px]"
                            >
                                <td className="py-2 text-center">{provider.id}</td>
                                <td className="py-2 flex justify-center gap-2 text-center">
                                    <div className="my-auto">{provider.name}</div>
                                </td>
                                <td className="py-2">{provider.description}</td>
                                <td className="py-2 flex gap-2 justify-center items-center">
                                    {(session?.user.role === RoleTypes.Admin || session?.user.role === RoleTypes.SuperAdmin) && 
                                        <Button variant="secondary" size="sm">
                                        View
                                    </Button>}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={()=>setSelectedDeleteId(provider.id)}
                                    >
                                        Delete
                                    </Button>
                                </td>
                            </tr>
                        ))}

                        {/* If no providers are found for the project */}
                        {projectProviders.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-500">
                                    No providers have been imported yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Delete Confirmation Dialog */}
            <Dialog open={!!selectedDeleteId} onOpenChange={()=>setSelectedDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className='font-semibold text-black'>{projectProviders.find(pp=>pp.id===selectedDeleteId)?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=>setSelectedDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Confirm Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}