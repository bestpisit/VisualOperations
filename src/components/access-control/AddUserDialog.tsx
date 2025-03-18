'use client';
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import { CirclePlus } from 'lucide-react';
import { handleApiError } from '@/types/api/apiError';

export default function AddUserDialog() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [open, setOpen] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        setFormData({ name: '', email: '', password: '' });
        setErrors({});
    };

    const validateForm = useCallback(
        debounce(async (data) => {
            try {
                const response = await axios.post('/api/access-control/users/validateInput', data);
                if (response.data.errors) {
                    setErrors(response.data.errors);
                } else {
                    setErrors({});
                }
            } catch (error) {
                handleApiError(error);
            }
        }, 250),
        []
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updatedFormData = { ...prev, [name]: value };
            validateForm(updatedFormData);
            return updatedFormData;
        });
    };

    const handleSubmit = async () => {
        await validateForm(formData);
        if (!Object.keys(errors).length) {
            try {
                await axios.post('/api/access-control/users', formData);
                toast.success('User created successfully');
                handleOpenChange(false);
                window.location.reload();
            } catch (error) {
                handleApiError(error);
            }
        }
    };

    return (
        <>
            <Button onClick={() => handleOpenChange(true)} className="py-2 h-12 bg-secondary-300 transition-colors duration-400 hover:bg-secondary-400 rounded-lg shadow border border-slate-400 flex justify-center items-center gap-2">
                <CirclePlus className="w-5 h-5 relative text-white" />
                <div className="text-white text-base font-normal leading-[30px]">New User</div>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle className='text-center'>Create New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-400 border p-2 rounded-md shadow-sm"
                            />
                            {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-400 border p-2 rounded-md shadow-sm"
                            />
                            {errors.email && <span className="text-sm text-red-500">{errors.email}</span>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border-gray-400 border p-2 rounded-md shadow-sm"
                            />
                            {errors.password && <span className="text-sm text-red-500">{errors.password}</span>}
                        </div>
                    </div>
                    <div className='flex justify-end space-x-2'>
                        <Button onClick={() => handleOpenChange(false)} className="py-2 h-10 bg-white transition-colors duration-400 hover:bg-slate-100 rounded-lg shadow border border-slate-400 flex justify-center items-center gap-2">
                            <div className="text-gray-700 text-base font-normal leading-[30px]">Cancel</div>
                        </Button>
                        <Button onClick={handleSubmit} disabled={Object.keys(errors).length > 0} className="py-2 h-10 bg-secondary-300 transition-colors duration-400 hover:bg-secondary-400 rounded-lg shadow border border-slate-400 flex justify-center items-center gap-2">
                            <CirclePlus className="w-5 h-5 relative text-white" />
                            <div className="text-white text-base font-normal leading-[30px]">Save</div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}