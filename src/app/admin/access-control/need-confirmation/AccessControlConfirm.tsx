'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { UserVerificationStatus } from '@/types/prisma/UserVerificationStatus';
import { UserListType } from '@/types/pages/access-control/UserListType';

const NeedConfirmationTab: React.FC = () => {
    const [users, setUsers] = useState<UserListType[]>([]);
    const [pendingUsers, setPendingUsers] = useState<UserListType[]>([]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/access-control/users');
            setUsers(response.data);
        } catch {
            toast.error('Failed to load users.');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleConfirmUser = async (userId: string) => {
        try {
            await axios.post('/api/access-control/users/confirm', { userId });
            toast.success('User confirmed successfully.');
            fetchUsers();
        } catch {
            toast.error('Error confirming user.');
        }
    };

    useEffect(() => {
        setPendingUsers(users.filter((user) => user.status === UserVerificationStatus.PENDING));
    }, [users]);

    return (
        <table className="table-auto w-full text-left">
            <thead>
                <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Action</th>
                </tr>
            </thead>
            <tbody>
                {pendingUsers.length > 0 ? (
                    pendingUsers.map((user) => (
                        <tr key={user.id} className="border-t">
                            <td className="px-4 py-2">{user.name}</td>
                            <td className="px-4 py-2">{user.email}</td>
                            <td className="px-4 py-2">
                                <button
                                    className="py-2 px-4 bg-green-500 text-white rounded"
                                    onClick={() => handleConfirmUser(user.id)}
                                >
                                    Confirm
                                </button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td className="px-4 py-2" colSpan={3}>
                            No pending users found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default NeedConfirmationTab;