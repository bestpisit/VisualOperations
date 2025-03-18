'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { UserVerificationStatus } from '@/types/prisma/UserVerificationStatus';
import { PermissionTypes, roleLevels, RoleTypes } from '@/types/prisma/RBACTypes';
import { useSession } from 'next-auth/react';
import { UserListType } from '@/types/pages/access-control/UserListType';
import { User } from '@prisma/client';
import { CircleCheck, Pencil, Trash2 } from 'lucide-react';
import { sessionHasPermission } from '@/lib/function/RBACFunction';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { handleApiError } from '@/types/api/apiError';
import EditUserDialog from '@/components/access-control/EditUserDialog';

const UsersTab: React.FC = () => {
    const { data: session } = useSession();
    const [verifiedUsers, setVerifiedUsers] = useState<UserListType[]>([]);
    const [editedUsers, setEditedUsers] = useState<{ userId: User['id']; newRole: RoleTypes }[]>([]); // Track changes
    const [showSaveButton, setShowSaveButton] = useState(false); // Show Save button if changes are made
    const [users, setUsers] = useState<UserListType[]>([]);

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

    useEffect(() => {
        setVerifiedUsers(users.filter((user) => user.status === UserVerificationStatus.VERIFIED));
    }, [users]);

    const [currentUserRoleLevel, setCurrentUserRoleLevel] = useState(roleLevels[session?.user?.role || RoleTypes.User]); // Get the current user's role level

    useEffect(() => {
        if (session?.user?.role) {
            setCurrentUserRoleLevel(roleLevels[session.user.role]);
        }
    }, [session]);

    // Filter available role options based on the current user's role level
    const roleOptions = Object.keys(roleLevels)
        .filter(role => roleLevels[role as RoleTypes] > currentUserRoleLevel) // Filter roles lower than the current user's level
        .map(role => role as RoleTypes);

    // Handle role change but don't trigger an update yet
    const handleRoleChange = (userId: string, newRole: RoleTypes) => {
        const originalUser = users.find((user) => user.id === userId);

        // If the new role matches the original role, remove it from the editedUsers
        if (originalUser && originalUser?.role?.name === newRole) {
            setEditedUsers((prev) => prev.filter((edit) => edit.userId !== userId));
        } else {
            setEditedUsers((prev) => {
                const userExists = prev.find((item) => item.userId === userId);
                if (userExists) {
                    return prev.map((item) =>
                        item.userId === userId ? { ...item, newRole } : item
                    );
                } else {
                    return [...prev, { userId, newRole }];
                }
            });
        }

        // Show save button if there are any changes
        setShowSaveButton(true);
    };

    // Handle saving changes
    const handleSaveChanges = async () => {
        try {
            await axios.post('/api/access-control/users/setRoles', {
                users: editedUsers,
            });
            toast.success('Roles updated successfully.');
            fetchUsers(); // Refetch users after save
            setEditedUsers([]); // Clear edits
            setShowSaveButton(false);
        } catch {
            toast.error('Error saving changes.');
        }
    };

    // Get the role of the user (either original or edited)
    const getUserRole = (userId: string) => {
        const editedUser = editedUsers.find((edit) => edit.userId === userId);
        const originalUser = verifiedUsers.find((user) => user.id === userId);
        return editedUser ? editedUser.newRole : originalUser?.role?.name || '';
    };

    // Restrict role editing based on role hierarchy
    const canEditRole = (targetRole: RoleTypes) => {
        const targetRoleLevel = roleLevels[targetRole];
        return targetRoleLevel > currentUserRoleLevel; // Can only edit roles below the current user's role level
    };

    const [deleteUserId, setDeleteUserId] = useState<User['id'] | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleDeleteOpen = (userId: User['id']) => {
        setDeleteUserId(userId);
        setDeleteDialogOpen(true);
    }

    const handleDeleteUser = async () => {
        const deletePromise = axios.delete(`/api/access-control/users/${deleteUserId}`);

        toast.promise(
            deletePromise,
            {
                pending: 'Deleting user...',
                success: 'User deleted successfully.',
            }
        );

        try {
            await deletePromise;
            fetchUsers(); // Refetch users after successful delete
            setDeleteDialogOpen(false);
        } catch (error) {
            handleApiError(error);  // Custom error handler
        }
    };

    const [editUserId, setEditUserId] = useState<User['id'] | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const handleEditOpen = (userId: User['id']) => {
        setEditUserId(userId);
        setEditDialogOpen(true);
    }

    return (
        <div className="relative">
            <table className="table-auto w-full text-left">
                <thead>
                    <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Role</th>
                    </tr>
                </thead>
                <tbody>
                    {verifiedUsers.length > 0 ? (
                        verifiedUsers.map((user) => {
                            const originalRole = user?.role?.name as RoleTypes || null;
                            const currentRole = getUserRole(user.id);

                            if (!originalRole) {
                                const isEdited = currentRole; // Only check if there's an original role

                                return (
                                    <tr
                                        key={user.id}
                                        className={`border-t ${session?.user.id === user.id ? 'bg-slate-100' : 'bg-white'}`}
                                    >
                                        <td className="px-4 py-2">{user.name}</td>
                                        <td className="px-4 py-2">{user.email}</td>
                                        <td className="px-4 py-2">
                                            <select
                                                onChange={(e) =>
                                                    handleRoleChange(user.id, e.target.value as RoleTypes)
                                                }
                                                value={currentRole || ''}  // Set default value to '' if no currentRole
                                                className={`border rounded px-2 py-1 focus:outline-none transition-colors ${isEdited ? 'bg-yellow-100' : ''
                                                    }`}
                                                disabled={session?.user.id === user.id} // Disable if trying to edit own role
                                            >
                                                <option value="" disabled>
                                                    Select Role
                                                </option>
                                                {roleOptions.map((roleName) => (
                                                    <option key={roleName} value={roleName}>
                                                        {roleName}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            }



                            const isEdited = originalRole !== currentRole; // Check if the role has been edited

                            // Only show editable roles below the current user's role level
                            const roleEditable = canEditRole(originalRole);

                            return (
                                <tr
                                    key={user.id}
                                    className={`border-t ${session?.user.id === user.id ? 'bg-slate-100' : 'bg-white'
                                        }`}
                                >
                                    <td className="px-4 py-2">{user.name}</td>
                                    <td className="px-4 py-2">{user.email}</td>
                                    <td className="px-4 py-2 flex items-center justify-between">
                                        {roleEditable ? (
                                            <select
                                                value={typeof currentRole === 'string' ? currentRole : currentRole || ''}
                                                onChange={(e) =>
                                                    handleRoleChange(user.id, e.target.value as RoleTypes)
                                                }
                                                className={`border rounded px-2 py-1 focus:outline-none transition-colors ${isEdited ? 'bg-yellow-100' : ''
                                                    }`}
                                                disabled={session?.user.id === user.id} // Disable if trying to edit own role
                                            >
                                                <option value="" disabled>
                                                    Select Role
                                                </option>
                                                {roleOptions.map((roleName) => (
                                                    <option key={roleName} value={roleName}>
                                                        {roleName}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span>{originalRole}</span> // If not editable, just display the role
                                        )}
                                        <div className='space-x-2 px-2 whitespace-nowrap'>
                                            {sessionHasPermission(session, [PermissionTypes.AdminUserManagement]) && (roleLevels[session?.user.role] < roleLevels[user.role.name || RoleTypes.User] || session?.user.role === RoleTypes.SuperAdmin) &&
                                                <>
                                                    <button onClick={() => handleEditOpen(user.id)} className='p-1 rounded-md bg-blue-500 hover:bg-blue-600'>
                                                        <Pencil size={20} className='text-white' />
                                                    </button>
                                                    <button onClick={() => handleDeleteOpen(user.id)} className='p-1 rounded-md bg-red-500 hover:bg-red-600'>
                                                        <Trash2 size={20} className='text-white' />
                                                    </button>
                                                </>
                                            }
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td className="px-4 py-2" colSpan={4}>
                                No users found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Save Changes Button */}
            {showSaveButton && editedUsers.length > 0 && (
                <div className="fixed bottom-4">
                    <button
                        onClick={handleSaveChanges}
                        className="px-4 py-2 bg-indigo-600 text-white rounded shadow-md hover:bg-indigo-700 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle className='text-center'>Are you sure to Delete</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        {users.find(usr => usr.id === deleteUserId)?.email}
                    </div>
                    <div className='flex justify-end space-x-2'>
                        <Button onClick={() => setDeleteDialogOpen(false)} className="py-2 h-10 bg-white transition-colors duration-200 hover:bg-slate-100 rounded-lg shadow border border-slate-200 flex justify-center items-center gap-2">
                            <div className="text-gray-700 text-base font-normal leading-[30px]">Cancel</div>
                        </Button>
                        <Button onClick={handleDeleteUser} className="py-2 h-10 bg-red-500 transition-colors duration-200 hover:bg-red-600 rounded-lg shadow border border-slate-200 flex justify-center items-center gap-2">
                            <CircleCheck className="w-5 h-5 relative text-white" />
                            <div className="text-white text-base font-normal leading-[30px]">Confirm</div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <EditUserDialog open={editDialogOpen} setOpen={setEditDialogOpen} userData={editUserId ? users.find(usr=>usr.id===editUserId) : null} fetchUser={fetchUsers}/>
        </div>
    );
};

export default UsersTab;