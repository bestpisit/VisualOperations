'use client';

import { useState } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'react-toastify';

const ChangePassword = ({ open, handleOpen }: { open: boolean, handleOpen: (value: boolean) => void }) => {
    const [masterPassword, setMasterPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [errors, setErrors] = useState<{
        masterPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handlePasswordChange = async () => {
        const newErrors: { newPassword?: string; confirmPassword?: string } = {};

        if (!newPassword) newErrors.newPassword = 'กรุณากรอกรหัสผ่านใหม่';
        if (newPassword !== confirmPassword) newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            setLoading(true);
            const response = await axios.post('/api/auth/me/changepassword', {
                currentPassword: masterPassword,
                newPassword,
            });

            if (response.status === 200) {
                setSuccessMessage('เปลี่ยนรหัสผ่านสำเร็จ!');
                setMasterPassword('');
                setNewPassword('');
                setConfirmPassword('');
                toast.success('เปลี่ยนรหัสผ่านสำเร็จ!');
                handleOpen(false);
                // await signOut({redirect: true});
            }
        } catch (error: any) {
            setErrors({
                masterPassword: error.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">เปลี่ยนรหัสผ่านของคุณ</DialogTitle>
                    <DialogDescription>
                        โปรดกรอกรหัสผ่านใหม่ที่คุณต้องการตั้ง และยืนยันรหัสผ่าน
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4">
                    <div className="mb-4">
                        <label className="block text-gray-700">รหัสผ่านปัจจุบัน</label>
                        <input
                            type="password"
                            className="border p-3 rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            placeholder="รหัสผ่านปัจจุบัน"
                        />
                        {errors.masterPassword && <span className="text-red-500 text-sm">{errors.masterPassword}</span>}
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700">รหัสผ่านใหม่</label>
                        <input
                            type="password"
                            className="border p-3 rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="รหัสผ่านใหม่"
                        />
                        {errors.newPassword && <span className="text-red-500 text-sm">{errors.newPassword}</span>}
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700">ยืนยันรหัสผ่านใหม่</label>
                        <input
                            type="password"
                            className="border p-3 rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="ยืนยันรหัสผ่านใหม่"
                        />
                        {errors.confirmPassword && <span className="text-red-500 text-sm">{errors.confirmPassword}</span>}
                    </div>

                    {successMessage && <p className="text-green-500 text-sm mt-2">{successMessage}</p>}
                </div>
                <DialogFooter>
                    <button
                        onClick={handlePasswordChange}
                        className="bg-green-500 text-white py-2 px-4 rounded-lg w-full shadow hover:bg-green-400 transition duration-300 ease-in-out"
                        disabled={loading}
                    >
                        {loading ? 'กำลังอัพเดต...' : 'อัพเดตรหัสผ่าน'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ChangePassword;