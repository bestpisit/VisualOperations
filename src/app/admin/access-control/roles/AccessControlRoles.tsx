'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Role, Permission } from '@prisma/client';
import { CirclePlus, Save } from 'lucide-react';

interface RoleType extends Role {
    RolePermissions: {
        permission: Permission;
    }[];
}

const RolesTab: React.FC = () => {
    const [roles, setRoles] = useState<RoleType[]>([]);
    const [permissionsList, setPermissionsList] = useState<Permission[]>([]);
    const [newRoleName, setNewRoleName] = useState('');

    const fetchRolesAndPermissions = async () => {
        try {
            const [rolesResponse, permissionsResponse] = await Promise.all([
                axios.get('/api/access-control/roles'),
                axios.get('/api/access-control/permissions'),
            ]);
            setRoles(rolesResponse.data);
            setPermissionsList(permissionsResponse.data);
        } catch{
            toast.error('Failed to load roles and permissions.');
        }
    };

    useEffect(() => {
        fetchRolesAndPermissions();
    }, []);

    const handleAddRole = async (roleName: string) => {
        try {
            await axios.post('/api/access-control/roles', { name: roleName });
            toast.success('Role added successfully.');
            setNewRoleName('');
            fetchRolesAndPermissions();
        } catch{
            toast.error('Error adding role.');
        }
    };

    const handleUpdateRolePermissions = async (roleId: number, permissionIds: number[]) => {
        try {
            await axios.put(`/api/access-control/roles/${roleId}/permissions`, { permissionIds });
            toast.success('Role permissions updated successfully.');
            fetchRolesAndPermissions();
        } catch{
            toast.error('Error updating role permissions.');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-6">Manage Roles</h2>
            <div className="flex items-center mb-6">
                <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="New Role Name"
                    className="border rounded-lg px-4 py-2 mr-2 w-1/3"
                />
                <button
                    onClick={() => newRoleName.trim() !== '' && handleAddRole(newRoleName.trim())}
                    className="flex items-center py-2 px-4 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition duration-200"
                >
                    <CirclePlus className="mr-2" />
                    Add Role
                </button>
            </div>
            {roles.length > 0 ? (
                roles.map((role) => (
                    <div key={role.id} className="border-b py-4">
                        <h3 className="font-semibold text-lg">{role.name}</h3>
                        <PermissionsEditor
                            role={role}
                            permissionsList={permissionsList}
                            onUpdateRolePermissions={handleUpdateRolePermissions}
                        />
                    </div>
                ))
            ) : (
                <p className="text-gray-500">No roles found.</p>
            )}
        </div>
    );
};

interface PermissionsEditorProps {
    role: RoleType;
    permissionsList: Permission[];
    onUpdateRolePermissions: (roleId: number, permissionIds: number[]) => void;
}

const PermissionsEditor: React.FC<PermissionsEditorProps> = ({
    role,
    permissionsList,
    onUpdateRolePermissions,
}) => {
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>(
        role.RolePermissions.map((p) => p.permission.id)
    );

    const handlePermissionToggle = (permissionId: number) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
        );
    };

    const handleSavePermissions = () => {
        onUpdateRolePermissions(role.id, selectedPermissions);
    };

    return (
        <div className="ml-6 mt-4">
            <h4 className="font-medium text-md mb-2">Permissions:</h4>
            <div className="grid grid-cols-2 gap-4">
                {permissionsList.map((permission) => (
                    <label key={permission.id} className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={() => handlePermissionToggle(permission.id)}
                            className="mr-2 rounded text-blue-500"
                        />
                        {permission.name}
                    </label>
                ))}
            </div>
            <button
                onClick={handleSavePermissions}
                className="mt-4 py-2 px-6 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition duration-200 flex items-center"
            >
                <Save className="mr-2" />
                Save Permissions
            </button>
        </div>
    );
};

export default RolesTab;
