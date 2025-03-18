'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import { UserListType } from '@/types/pages/access-control/UserListType';
import { providerRoleLevels, RoleTypes } from '@/types/prisma/RBACTypes';
import { User } from '@prisma/client';
import { Trash } from 'lucide-react';
import { useParams } from 'next/navigation';

const AccessControlPage: React.FC = () => {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserListType[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
    const [errorUsers, setErrorUsers] = useState<string | null>(null);
    const [editedUsers, setEditedUsers] = useState<{ userId: User['id']; newRole: RoleTypes }[]>([]); // Track changes
    const [showSaveButton, setShowSaveButton] = useState(false); // Show Save button if changes are made
    const [showAddUserModal, setShowAddUserModal] = useState(false); // Track the visibility of the add user modal
    const [showRemoveUserModal, setShowRemoveUserModal] = useState<{ show: boolean; email: string | null }>({
        show: false,
        email: null,
    }); // Track the visibility of the remove user confirmation modal
    const [newUserEmail, setNewUserEmail] = useState<string>(''); // Track new user email
    const [newUserRole, setNewUserRole] = useState<RoleTypes | ''>(''); // Track new user role
    const { providerName } = useParams();

    // Fetch users from the API
    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await axios.get(`/api/providers/${providerName}/access-control`);
            setUsers(response.data);
        } catch {
            setErrorUsers('Failed to load users.');
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Get current user's role level for role-based access control
    const currentUserRoleLevel = providerRoleLevels[RoleTypes.ProviderOwner];

    // Filter role options to show roles lower than the current user's role level
    const roleOptions = Object.keys(providerRoleLevels)
        .filter((role) => providerRoleLevels[role as RoleTypes] > currentUserRoleLevel)
        .map((role) => role as RoleTypes);

    // Handle role change but don't update yet
    const handleRoleChange = (userId: string, newRole: RoleTypes) => {
        const originalUser = users.find((user) => user.id === userId);

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

        setShowSaveButton(true); // Show save button if changes are made
    };

    // Handle saving changes
    const handleSaveChanges = async () => {
        try {
            await axios.put(`/api/providers/${providerName}/access-control`, {
                users: editedUsers,
            });
            toast.success('Roles updated successfully.');
            fetchUsers(); // Refetch users after saving
            setEditedUsers([]); // Clear edited users list
            setShowSaveButton(false);
        } catch (error: any) {
            toast.error(error.response.data.message || 'Error saving changes.');
        }
    };

    // Add new user to access control
    const handleAddUser = async () => {
        if (!newUserEmail || !newUserRole) {
            toast.error('Please provide both email and role.');
            return;
        }

        try {
            await axios.post(`/api/providers/${providerName}/access-control`, {
                email: newUserEmail,
                role: newUserRole,
            });
            toast.success('User added successfully.');
            setShowAddUserModal(false); // Close the modal after successful addition
            fetchUsers(); // Refetch the updated user list
            setNewUserEmail(''); // Reset the email input
            setNewUserRole(''); // Reset the role selection
        } catch (error: any) {
            toast.error(error.response.data.message || 'Error adding user.');
        }
    };

    // Remove user from access control
    const handleRemoveUser = async () => {
        const userEmailToRemove = showRemoveUserModal.email;
        if (!userEmailToRemove) return;

        try {
            await axios.delete(`/api/providers/${providerName}/access-control`, {
                data: { email: userEmailToRemove },
            });
            toast.success('User removed successfully.');
            setShowRemoveUserModal({ show: false, email: null }); // Close modal after successful deletion
            fetchUsers(); // Refetch the updated user list
        } catch (error: any) {
            toast.error(error.response.data.message || 'Error removing user.');
        }
    };

    // Get the current role of the user (either the original or the edited role)
    const getUserRole = (userId: string) => {
        const editedUser = editedUsers.find((edit) => edit.userId === userId);
        const originalUser = users.find((user) => user.id === userId);
        return editedUser ? editedUser.newRole : originalUser?.role.name || '';
    };

    // Restrict role editing based on role hierarchy
    const canEditRole = (targetRole: RoleTypes) => {
        const targetRoleLevel = providerRoleLevels[targetRole];
        return targetRoleLevel > currentUserRoleLevel; // Can only edit roles below the current user's level
    };

    // If there is an error loading users
    if (errorUsers) return <p>{errorUsers}</p>;

    return (
        <div className="flex-grow w-full h-full bg-secondary-100 flex flex-col overflow-auto">
            <div className="flex justify-items-start p-4 py-0 bg-white rounded-lg h-[80px] min-h-[80px] max-h-[80px]">
                <h1 className="font-bold text-2xl text-slate-800 text-center my-auto ml-3">Access Control</h1>
            </div>
            <div className="flex-grow w-full h-full flex flex-col overflow-auto shadow-inner bg-gradient-to-br from-white to-indigo-100 p-2">
                <div className="flex justify-between mb-4">
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => setShowAddUserModal(true)} // Show the Add User Modal
                    >
                        Add User
                    </button>
                </div>

                <div className="flex-grow w-full h-full overflow-auto shadow-inner bg-white p-4">
                    {loadingUsers ? (
                        <p>Loading users...</p>
                    ) : (
                        <table className="table-auto w-full text-left">
                            <thead>
                                <tr>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Email</th>
                                    <th className="px-4 py-2">Role</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.map((user) => {
                                        const currentRole = getUserRole(user.id);
                                        const originalRole = user?.role?.name as RoleTypes || null;

                                        const isEdited = originalRole !== currentRole;
                                        const roleEditable = canEditRole(originalRole);

                                        return (
                                            <tr
                                                key={user.id}
                                                className={`border-t ${session?.user.id === user.id ? 'bg-slate-100' : 'bg-white'}`}
                                            >
                                                <td className="px-4 py-2">{user.name}</td>
                                                <td className="px-4 py-2">{user.email}</td>
                                                <td className="px-4 py-2">
                                                    {roleEditable ? (
                                                        <select
                                                            value={currentRole}
                                                            onChange={(e) =>
                                                                handleRoleChange(user.id, e.target.value as RoleTypes)
                                                            }
                                                            className={`border rounded px-2 py-1 focus:outline-none transition-colors ${isEdited ? 'bg-yellow-100' : ''
                                                                }`}
                                                            disabled={session?.user.id === user.id} // Disable if editing own role
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
                                                        <span>{originalRole}</span>
                                                    )}
                                                </td>
                                                {
                                                    user.role?.name !== RoleTypes.ProviderOwner && <td className="px-4 py-2 text-right">
                                                        <button
                                                            onClick={() =>
                                                                setShowRemoveUserModal({ show: true, email: user.email })
                                                            }
                                                        >
                                                            <Trash className="w-5 h-5 text-red-500 hover:text-red-700" />
                                                        </button>
                                                    </td>
                                                }
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
                    )}

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
                </div>

                {/* Add User Modal */}
                {showAddUserModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-6 rounded shadow-lg w-96">
                            <h2 className="text-xl font-bold mb-4">Add User to Provider</h2>
                            <div className="mb-4">
                                <label className="block text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="border rounded px-3 py-2 w-full"
                                    placeholder="Enter user email"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700">Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as RoleTypes)}
                                    className="border rounded px-3 py-2 w-full"
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
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                    onClick={() => setShowAddUserModal(false)} // Close modal
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    onClick={handleAddUser}
                                >
                                    Add User
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Remove User Modal */}
                {showRemoveUserModal.show && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white p-6 rounded shadow-lg w-96">
                            <h2 className="text-xl font-bold mb-4">Remove User</h2>
                            <p>Are you sure you want to remove {showRemoveUserModal.email} from the provider?</p>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                    onClick={() => setShowRemoveUserModal({ show: false, email: null })} // Close modal
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                    onClick={handleRemoveUser}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccessControlPage;