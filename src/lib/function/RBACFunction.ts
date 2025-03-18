import { PermissionTypes,rolePermissionsMapping, RoleTypes } from "@/types/prisma/RBACTypes";
import { Session } from "next-auth";

export const sessionHasPermission = (session: Session|null, requiredPermissions: PermissionTypes[]) => {
    try{
        if(!session || !session.user){
            return false;
        }
        return requiredPermissions.every(permission => 
            rolePermissionsMapping[session.user.role as keyof typeof rolePermissionsMapping]?.includes(permission)
        );
    }
    catch{
        return false;
    }
}

export const roleHasPermission = (role: RoleTypes, requiredPermissions: PermissionTypes[]) => {
    try{
        return requiredPermissions.every(permission => 
            rolePermissionsMapping[role as keyof typeof rolePermissionsMapping]?.includes(permission)
        );
    }
    catch{
        return false;
    }
}