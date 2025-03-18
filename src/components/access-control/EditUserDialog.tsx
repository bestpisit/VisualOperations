'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import { CirclePlus } from 'lucide-react';
import { handleApiError } from '@/types/api/apiError';
import { UserListType } from '@/types/pages/access-control/UserListType';
import { useSession } from 'next-auth/react';
import { RoleTypes } from '@/types/prisma/RBACTypes';

export default function EditUserDialog({ open, setOpen, userData, fetchUser }: { open: boolean, setOpen: (isOpen: boolean) => void, userData?: UserListType | null, fetchUser?: () => void }) {
    const [formData, setFormData] = useState<{ name: string | null, email: string | null }>({ name: '', email: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [editedFields, setEditedFields] = useState<Record<string, boolean>>({});
    const { data: session } = useSession();

    useEffect(() => {
        if (!open) return;
        if (!userData) return;
        setFormData({
            name: userData.name,
            email: userData.email
        });
        setEditedFields({});
        setErrors({});
    }, [userData, open]);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        setFormData({ name: '', email: '' });
        setErrors({});
        setEditedFields({});
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updatedFormData = { ...prev, [name]: value };
            const isFieldEdited = !!(userData && value !== userData[name as keyof UserListType]);
            setEditedFields((prevFields) => ({ ...prevFields, [name]: isFieldEdited }));
            return updatedFormData;
        });
    };

    const handleEdit = async () => {
        const editedData = Object.fromEntries(
            Object.entries(formData).filter(([key]) => editedFields[key])
        );

        if (Object.keys(editedData).length === 0) {
            toast.info('No changes to save.');
            return;
        }

        toast.promise(
            axios.put('/api/access-control/users/' + userData?.id, editedData),
            {
                pending: 'Updating user...',
                success: 'User updated successfully!',
            }
        ).then(() => {
            if (session?.user?.role === RoleTypes.SuperAdmin && userData?.id === session?.user?.id) {
                window.location.reload();
            }
            else {
                handleOpenChange(false);
                fetchUser?.();
            }
        }).catch(e => {
            handleApiError(e);
        })
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle className='text-center'>Edit User</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full border-gray-300 border p-2 rounded-md shadow-sm ${editedFields.name ? 'bg-yellow-100' : ''}`}
                        />
                        {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                            className={`mt-1 block w-full border-gray-300 border p-2 rounded-md shadow-sm ${editedFields.email ? 'bg-yellow-100' : ''}`}
                        />
                        {errors.email && <span className="text-sm text-red-500">{errors.email}</span>}
                    </div>
                </div>
                <div className='flex justify-end space-x-2'>
                    <Button onClick={() => handleOpenChange(false)} className="py-2 h-10 bg-white transition-colors duration-200 hover:bg-slate-100 rounded-lg shadow border border-slate-200 flex justify-center items-center gap-2">
                        <div className="text-gray-700 text-small font-normal leading-[30px]">Cancel</div>
                    </Button>
                    <Button onClick={handleEdit} disabled={
                        Object.entries(formData).filter(([key]) => editedFields[key]).length === 0
                    } className="py-2 h-10 bg-secondary-300 transition-colors duration-200 hover:bg-secondary-400 rounded-lg shadow border border-slate-200 flex justify-center items-center gap-2">
                        <CirclePlus className="w-5 h-5 relative text-white" />
                        <div className="text-white text-small font-normal leading-[30px]">Save</div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}