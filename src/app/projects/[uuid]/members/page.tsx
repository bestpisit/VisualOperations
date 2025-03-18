'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRoundPlus, Trash } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams } from 'next/navigation';
import { PermissionTypes, RoleTypes, projectRoleLevels } from '@/types/prisma/RBACTypes';
import { UserListType } from '@/types/pages/access-control/UserListType';
import { useProjectContext } from "@/lib/context/ProjectContext";
import { roleHasPermission } from "@/lib/function/RBACFunction";

export default function ProjectMembersPage() {
    const [members, setMembers] = useState<UserListType[]>([]);
    const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
    const [editedMembers, setEditedMembers] = useState<{ userId: string; newRole: RoleTypes }[]>([]);
    const [showSaveButton, setShowSaveButton] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState<{ show: boolean; email: string | null }>({
        show: false,
        email: null,
    });
    const [newMemberEmail, setNewMemberEmail] = useState<string>('');
    const [newMemberRole, setNewMemberRole] = useState<RoleTypes | ''>('');
    const { uuid } = useParams();
    const { project } = useProjectContext();

    // Fetch members from the API
    const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
            const response = await axios.get(`/api/projects/${uuid}/access-control`);
            setMembers(response.data);
        } catch {
            toast.error('Failed to load members.');
        } finally {
            setLoadingMembers(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    // Role level and role options based on the current user role
    const currentUserRoleLevel = projectRoleLevels[project.role.name as RoleTypes];

    const roleOptions = Object.keys(projectRoleLevels)
        .filter((role) => projectRoleLevels[role as RoleTypes] > currentUserRoleLevel)
        .map((role) => role as RoleTypes);

    // Handle role change (without saving yet)
    const handleRoleChange = (userId: string, newRole: RoleTypes) => {
        const originalMember = members.find((member) => member.id === userId);

        if (originalMember && originalMember.role.name === newRole) {
            setEditedMembers((prev) => prev.filter((edit) => edit.userId !== userId));
        } else {
            setEditedMembers((prev) => {
                const memberExists = prev.find((item) => item.userId === userId);
                if (memberExists) {
                    return prev.map((item) =>
                        item.userId === userId ? { ...item, newRole } : item
                    );
                } else {
                    return [...prev, { userId, newRole }];
                }
            });
        }

        setShowSaveButton(true);
    };

    // Save changes (updated roles)
    const handleSaveChanges = async () => {
        try {
            await axios.put(`/api/projects/${uuid}/access-control`, { members: editedMembers });
            toast.success('Roles updated successfully.');
            fetchMembers();
            setEditedMembers([]);
            setShowSaveButton(false);
        } catch {
            toast.error('Error saving changes.');
        }
    };

    // Add new member
    const handleAddMember = async () => {
        if (!newMemberEmail || !newMemberRole) {
            toast.error('Please provide both email and role.');
            return;
        }

        try {
            await axios.post(`/api/projects/${uuid}/access-control`, {
                email: newMemberEmail,
                role: newMemberRole,
            });
            toast.success('Member added successfully.');
            setShowAddMemberModal(false);
            fetchMembers();
            setNewMemberEmail('');
            setNewMemberRole('');
        } catch {
            toast.error('Error adding member.');
        }
    };

    // Remove member
    const handleRemoveMember = async () => {
        const memberEmailToRemove = showRemoveMemberModal.email;
        if (!memberEmailToRemove) return;

        try {
            await axios.delete(`/api/projects/${uuid}/access-control`, { data: { email: memberEmailToRemove } });
            toast.success('Member removed successfully.');
            setShowRemoveMemberModal({ show: false, email: null });
            fetchMembers();
        } catch {
            toast.error('Error removing member.');
        }
    };

    const getUserRole = (userId: string) => {
        const editedMember = editedMembers.find((edit) => edit.userId === userId);
        const originalMember = members.find((member) => member.id === userId);
        return editedMember ? editedMember.newRole : originalMember?.role.name || '';
    };

    const canEditRole = (targetRole: RoleTypes) => {
        const targetRoleLevel = projectRoleLevels[targetRole];
        return targetRoleLevel > currentUserRoleLevel;
    };

    return (
        <div className='border-l flex-grow flex flex-col'>
            {/* Action Bar */}
            <div className="bg-slate-50 px-4 py-2 flex justify-start items-center space-x-4 border-b">
                { roleHasPermission(project.role.name as RoleTypes, [PermissionTypes.ProjectAccessControl]) && 
                    <button
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                    onClick={() => setShowAddMemberModal(true)} // Open Add Member Modal
                >
                    <UserRoundPlus className="w-5 h-5" />
                    <span>Add Member</span>
                </button>}
            </div>

            {/* Members List */}
            <div className="py-0">
                {loadingMembers ? (
                    <p>Loading members...</p>
                ) : (
                    <table className="min-w-full table-auto bg-white shadow-md overflow-hidden">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">Role</th>
                                <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length > 0 ? (
                                members.map((member) => {
                                    const currentRole = getUserRole(member.id);
                                    const originalRole = member.role.name as RoleTypes;
                                    const roleEditable = canEditRole(originalRole);

                                    return (
                                        <tr key={member.id} className="border-b">
                                            <td className="px-4 py-2">{member.name}</td>
                                            <td className="px-4 py-2">{member.email}</td>
                                            <td className="px-4 py-2">
                                                {roleEditable ? (
                                                    <select
                                                        value={currentRole}
                                                        onChange={(e) =>
                                                            handleRoleChange(member.id, e.target.value as RoleTypes)
                                                        }
                                                        className="border rounded px-2 py-1"
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
                                            {roleHasPermission(project.role.name as RoleTypes, [PermissionTypes.ProjectAccessControl]) && member.role.name !== RoleTypes.ProjectOwner && (
                                                <td className="px-4 py-2 text-right">
                                                    <button
                                                        onClick={() =>
                                                            setShowRemoveMemberModal({ show: true, email: member.email })
                                                        }
                                                    >
                                                        <Trash className="w-5 h-5 text-red-500 hover:text-red-700" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-4">
                                        No members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {/* Save Changes Button */}
                {showSaveButton && (
                    <div className="fixed bottom-4">
                        <button
                            onClick={handleSaveChanges}
                            className="px-4 py-2 bg-indigo-600 text-white rounded shadow-md hover:bg-indigo-700 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                )}

                {/* Add Member Modal */}
                <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
                    <DialogContent aria-describedby={undefined}>
                        <DialogHeader>
                            <DialogTitle>Add New Member</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700">Email</label>
                                <Input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    placeholder="Enter member email"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700">Role</label>
                                <Select
                                    value={newMemberRole}
                                    onValueChange={(value) => setNewMemberRole(value as RoleTypes)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[6000]">
                                        {roleOptions.map((roleName) => (
                                            <SelectItem key={roleName} value={roleName}>
                                                {roleName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddMemberModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddMember}>Add Member</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Remove Member Modal */}
                <Dialog
                    open={showRemoveMemberModal.show}
                    onOpenChange={(open) => setShowRemoveMemberModal({ show: open, email: null })}
                >
                    <DialogContent aria-describedby={undefined}>
                        <DialogHeader>
                            <DialogTitle>Remove Member</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to remove <strong>{showRemoveMemberModal.email}</strong> from the project?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRemoveMemberModal({ show: false, email: null })}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleRemoveMember}>
                                Remove
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};