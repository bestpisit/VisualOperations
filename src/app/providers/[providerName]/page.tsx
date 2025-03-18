'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Provider as PrismaProvider } from '@prisma/client';
import { toast } from 'react-toastify';
import { useParams, useRouter } from 'next/navigation';

import { RoleTypes } from '@/types/prisma/RBACTypes';
import { ROUTES } from '@/lib/route';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputTypes, ProviderConfiguration } from '@/types/PlatformStructure';
import { handleApiError } from '@/types/api/apiError';

type ConfigKey = {
    type: InputTypes;
    value: any;
    configuration?: boolean;
    secret?: boolean;
    providerId: string;
};

interface Provider extends PrismaProvider {
    role: RoleTypes;
    config: Record<string, ConfigKey>;
}

const ProviderPage = () => {
    const router = useRouter();
    const params = useParams();
    const providerName = params.providerName as string;

    const [provider, setProvider] = useState<Provider | null>(null);
    const [originalName, setOriginalName] = useState('');
    const [originalDescription, setOriginalDescription] = useState('');
    const [originalConfig, setOriginalConfig] = useState<Record<string, ConfigKey>>({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        if (providerName) {
            fetchProviderData();
        }
    }, [providerName]);

    const fetchProviderData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/providers/${providerName}`);
            const fetchedProvider = response.data as Provider;
            setProvider(fetchedProvider);

            // Store originals for comparison
            setOriginalName(fetchedProvider.name);
            setOriginalDescription(fetchedProvider.description ?? '');
            setOriginalConfig(fetchedProvider.config ?? {});
        } catch {
            setError('Failed to fetch provider data');
        } finally {
            setLoading(false);
        }
    };

    // For name & description changes
    const handleProviderFieldChange = (field: 'name' | 'description', value: string) => {
        if (!provider) return;
        setProvider({
            ...provider,
            [field]: value,
        });
    };

    const handleConfigChange = (key: string, value: any) => {
        if (!provider) return;

        setProvider((prev) => {
            if (!prev) return prev; // Ensure state exists

            return {
                ...prev,
                config: {
                    ...prev.config,
                    [key]: {
                        ...prev.config[key],
                        value: value, // Directly update the value
                    },
                },
            };
        });
    };

    const handleListInputChange = (key: string, newItem: string) => {
        if (!provider) return;

        setProvider((prev) => {
            if (!prev) return prev;

            const currentList = Array.isArray(prev.config[key]?.value) ? prev.config[key].value : [];

            return {
                ...prev,
                config: {
                    ...prev.config,
                    [key]: {
                        ...prev.config[key],
                        value: [...currentList, newItem], // Add new item
                    },
                },
            };
        });
    };

    const handleListItemRemove = (key: string, itemToRemove: string) => {
        if (!provider) return;

        setProvider((prev) => {
            if (!prev) return prev;

            return {
                ...prev,
                config: {
                    ...prev.config,
                    [key]: {
                        ...prev.config[key],
                        value: prev.config[key].value.filter((item: string) => item !== itemToRemove),
                    },
                },
            };
        });
    };

    // Detect if config changed from original
    const isConfigChanged = () => {
        if (!provider) return false;
        const currentConfig = provider.config ?? {};
        // Compare each key's value with the original
        if (Object.keys(currentConfig).length !== Object.keys(originalConfig).length) {
            return true;
        }
        for (const key of Object.keys(currentConfig)) {
            if (currentConfig[key].value !== originalConfig[key]?.value) {
                return true;
            }
        }
        return false;
    };

    const handleUpdate = async () => {
        if (!provider) return;

        // Build the payload according to changes
        const payload: Record<string, any> = {
            ...((provider.name !== originalName || provider.description !== originalDescription) && {
                name: provider.name,
                description: provider.description,
            }),
        };

        if (isConfigChanged()) {
            payload.newConfig = {} as ProviderConfiguration;
            for (const key of Object.keys(provider.config)) {
                if (provider.config[key].value !== originalConfig[key]?.value) {
                    payload.newConfig[key] = {
                        value: provider.config[key].value,
                    };
                }
            }
        }

        try {
            const res = await axios.put(`/api/providers/${providerName}`, payload);
            toast.success('Provider updated successfully');
            // Update original fields after successful save
            setOriginalName(provider.name);
            setOriginalDescription(provider.description ?? '');
            setOriginalConfig(provider.config ?? {});

            router.push(ROUTES.PROVIDER(res.data.name));
        } catch (e) {
            const message = handleApiError(e, "Failed to update provider");
            toast.error(message);
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/providers/${providerName}`);
            toast.success('Provider deleted successfully');
            router.push('/providers');
        } catch (e) {
            const message = handleApiError(e, "Failed to delete provider");
            toast.error(message);
        }
    };

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center">
                Provider Details
                <div className='ml-auto space-x-4'>
                    {(provider?.role === RoleTypes.ProviderOwner) && (
                        <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                            Delete Provider
                        </Button>
                    )}
                    {provider?.role === RoleTypes.ProviderOwner && (
                        <Button
                            variant="default"
                            className="ml-auto"
                            onClick={() => router.push(ROUTES.PROVIDER_ACCESS_CONTROL(providerName))}
                        >
                            Manage Access
                        </Button>
                    )}
                </div>
            </h1>

            {provider ? (
                <div className="space-y-6">
                    {/* Name */}
                    <div>
                        <Label htmlFor="provider-name" className="mb-2">
                            Provider Name
                        </Label>
                        <Input
                            id="provider-name"
                            value={provider.name}
                            onChange={(e) => handleProviderFieldChange('name', e.target.value)}
                            className={`${originalName !== provider.name ? 'bg-yellow-50' : ''}`}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="provider-desc" className="mb-2">
                            Description
                        </Label>
                        <Textarea
                            id="provider-desc"
                            value={provider.description || ''}
                            className={`${originalDescription !== provider.description ? 'bg-yellow-50' : ''}`}
                            onChange={(e) => handleProviderFieldChange('description', e.target.value)}
                        />
                    </div>

                    {/* Toggle Config */}
                    <div>
                        <Button variant="outline" onClick={() => setShowConfig(!showConfig)}>
                            {showConfig ? 'Hide Configuration' : 'Show Configuration'}
                        </Button>
                    </div>

                    {showConfig && (
                        <div className="transition-all duration-300 ease-in-out">
                            <Label className="mb-2 block">Configuration</Label>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/4">Key</TableHead>
                                        <TableHead className="w-3/4">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(provider.config).map(([key, configVal]) => {
                                        const originalVal = originalConfig[key]?.value ?? '';
                                        const changed = JSON.stringify(configVal.value) !== JSON.stringify(originalVal);

                                        return (
                                            <TableRow key={key} className={changed ? 'bg-yellow-50' : ''}>
                                                <TableCell className="font-medium">{key}</TableCell>
                                                <TableCell>
                                                    {configVal.type === InputTypes.Boolean ? (
                                                        // Boolean (Checkbox)
                                                        <input
                                                            type="checkbox"
                                                            className="mr-2 leading-tight"
                                                            checked={!!configVal.value}
                                                            onChange={(e) => handleConfigChange(key, e.target.checked)}
                                                        />
                                                    ) : configVal.type === InputTypes.Number ? (
                                                        // Number Input
                                                        <Input
                                                            type="number"
                                                            value={configVal.value}
                                                            onChange={(e) => handleConfigChange(key, Number(e.target.value))}
                                                        />
                                                    ) : configVal.type === InputTypes.List ? (
                                                        // List (Array) Input
                                                        <div className="space-y-2">
                                                            {/* Render existing list items */}
                                                            {(Array.isArray(configVal.value) ? configVal.value : []).map((item: string, index: number) => (
                                                                <div key={`${key}-${index}`} className="flex gap-2">
                                                                    <Input
                                                                        value={item}
                                                                        onChange={(e) => {
                                                                            const updatedList = [...configVal.value];
                                                                            updatedList[index] = e.target.value;
                                                                            handleConfigChange(key, updatedList);
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => handleListItemRemove(key, item)}
                                                                    >
                                                                        ✕
                                                                    </Button>
                                                                </div>
                                                            ))}

                                                            {/* Input field for adding new list items */}
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    type="text"
                                                                    className="border px-4 py-2 rounded w-full"
                                                                    placeholder={`Add value to ${key}`}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                                                            e.preventDefault();
                                                                            handleListInputChange(key, e.currentTarget.value.trim());
                                                                            e.currentTarget.value = ''; // Reset input field after adding
                                                                        }
                                                                    }}
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        const inputField = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                        if (inputField.value.trim() !== '') {
                                                                            handleListInputChange(key, inputField.value.trim());
                                                                            inputField.value = ''; // Reset input field after adding
                                                                        }
                                                                    }}
                                                                >
                                                                    + Add
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Default Text or Secret Input
                                                        <Input
                                                            type={configVal.secret ? 'password' : 'text'}
                                                            value={configVal.secret ? '******' : configVal.value}
                                                            onChange={(e) => handleConfigChange(key, e.target.value)}
                                                            disabled={configVal.secret}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-4 justify-end mb-4">
                        {
                            (provider.role === RoleTypes.ProviderEditor || provider.role === RoleTypes.ProviderOwner) && (isConfigChanged() || originalDescription !== provider.description || originalName !== provider.name) &&
                            <Button onClick={handleUpdate} className='bg-secondary-250 hover:bg-secondary-400'>Update Provider</Button>
                        }
                    </div>

                    {/* Confirmation Modal for Delete */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                            <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full">
                                <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
                                <p className="mb-4">
                                    Are you sure you want to delete this provider? This action cannot be
                                    undone.
                                </p>
                                <div className="flex justify-end space-x-4">
                                    <Button variant="destructive" onClick={handleDelete}>
                                        Yes, Delete
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div>No provider data found</div>
            )}
        </div>
    );
};

export default ProviderPage;