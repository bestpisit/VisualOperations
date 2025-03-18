export enum PermissionTypes {
    //Admin Permission
    AdminUserManagement = 'ADMIN_USER_MANAGEMENT',  // Manage users
    ProjectQuotaManagement = 'PROJECT_QUOTA_MANAGEMENT',  // Manage project quotas

    //Project Permission
    ProjectCreate = 'PROJECT_CREATE',  // Create new projects
    ProjectUpdate = 'PROJECT_UPDATE',  // Update existing projects
    ProjectDelete = 'PROJECT_DELETE',  // Delete projects
    ProjectRead = 'PROJECT_READ',  // Read projects
    ProjectResourceCreate = 'PROJECT_RESOURCE_CREATE',  // Create new projects
    ProjectResourceUpdate = 'PROJECT_RESOURCE_UPDATE',  // Update existing projects
    ProjectResourceDelete = 'PROJECT_RESOURCE_DELETE',  // Delete projects
    ProjectResourceRead = 'PROJECT_RESOURCE_READ',  // Read projects
    ProjectAccessControl = 'PROJECT_ACCESS_CONTROL',  // Manage user access (owners only)
    ProjectVersionControl = 'PROJECT_VERSION_CONTROL',  // Manage version control
    ProjectProviderRead = 'PROJECT_PROVIDER_READ',  // Read project providers

    //Provider Permission
    ProviderEdit = 'PROVIDER_EDIT',  // Edit provider details
    ProviderRead = 'PROVIDER_READ',  // Delete provider
    ProviderAccessControl = 'PROVIDER_ACCESS_CONTROL',  // Manage user access (owners only)

    //Template Permission
    TemplateRead = 'TEMPLATE_READ',  // Read templates
    TemplateCreate = 'TEMPLATE_CREATE',  // Create templates
    TemplateUpdate = 'TEMPLATE_UPDATE',  // Update templates
    TemplateDelete = 'TEMPLATE_DELETE',  // Delete templates
}
export enum RoleTypes {
    SuperAdmin = 'SUPER_ADMIN',
    Admin = 'ADMIN',
    User = 'USER',
    ProjectOwner = 'PROJECT_OWNER',
    ProjectContributor = 'PROJECT_CONTRIBUTOR',
    ProjectViewer = 'PROJECT_VIEWER',
    ProviderOwner = 'PROVIDER_OWNER',
    ProviderEditor = 'PROVIDER_EDITOR',
    ProviderViewer = 'PROVIDER_VIEWER',
}

export const rolePermissionsMapping: { [key in RoleTypes]?: PermissionTypes[] } = {
    [RoleTypes.SuperAdmin]: [
        PermissionTypes.AdminUserManagement,
        PermissionTypes.ProjectQuotaManagement,
        PermissionTypes.ProjectCreate,
        PermissionTypes.ProjectUpdate,
        PermissionTypes.ProjectDelete,
        PermissionTypes.ProjectRead,
        PermissionTypes.ProjectResourceCreate,
        PermissionTypes.ProjectResourceUpdate,
        PermissionTypes.ProjectResourceDelete,
        PermissionTypes.ProjectResourceRead,
        PermissionTypes.ProjectAccessControl,
        PermissionTypes.ProviderEdit,
        PermissionTypes.ProviderRead,
        PermissionTypes.ProviderAccessControl,
        PermissionTypes.TemplateRead,
        PermissionTypes.TemplateCreate,
        PermissionTypes.TemplateUpdate,
        PermissionTypes.TemplateDelete,
        PermissionTypes.ProjectVersionControl,
        PermissionTypes.ProjectProviderRead,
    ],
    [RoleTypes.Admin]: [
        PermissionTypes.AdminUserManagement,
        PermissionTypes.ProjectQuotaManagement,
        PermissionTypes.ProjectCreate,
        PermissionTypes.ProjectUpdate,
        PermissionTypes.ProjectDelete,
        PermissionTypes.ProjectRead,
        PermissionTypes.ProjectResourceCreate,
        PermissionTypes.ProjectResourceUpdate,
        PermissionTypes.ProjectResourceDelete,
        PermissionTypes.ProjectResourceRead,
        PermissionTypes.ProjectAccessControl,
        PermissionTypes.TemplateRead,
        PermissionTypes.TemplateCreate,
        PermissionTypes.TemplateUpdate,
        PermissionTypes.TemplateDelete,
        PermissionTypes.ProjectVersionControl,
        PermissionTypes.ProjectProviderRead,
    ],
    [RoleTypes.ProjectOwner]: [
        PermissionTypes.ProjectUpdate,
        PermissionTypes.ProjectDelete,
        PermissionTypes.ProjectRead,
        PermissionTypes.TemplateRead,
        PermissionTypes.ProjectResourceCreate,
        PermissionTypes.ProjectResourceUpdate,
        PermissionTypes.ProjectResourceDelete,
        PermissionTypes.ProjectResourceRead,
        PermissionTypes.ProjectAccessControl,
        PermissionTypes.ProjectVersionControl,
        PermissionTypes.ProjectProviderRead,
    ],
    [RoleTypes.ProjectContributor]: [
        PermissionTypes.ProjectUpdate,
        PermissionTypes.ProjectRead,
        PermissionTypes.TemplateRead,
        PermissionTypes.ProjectResourceCreate,
        PermissionTypes.ProjectResourceUpdate,
        PermissionTypes.ProjectResourceDelete,
        PermissionTypes.ProjectResourceRead,
        PermissionTypes.ProjectProviderRead,
    ],
    [RoleTypes.ProjectViewer]: [
        PermissionTypes.ProjectRead,
        PermissionTypes.TemplateRead,
        PermissionTypes.ProjectResourceRead,
    ],
    [RoleTypes.ProviderOwner]: [
        PermissionTypes.ProviderRead,
        PermissionTypes.ProviderEdit,
        PermissionTypes.TemplateRead,
        PermissionTypes.ProviderAccessControl,
    ],
    [RoleTypes.ProviderEditor]: [
        PermissionTypes.TemplateRead,
        PermissionTypes.ProviderEdit,
        PermissionTypes.ProviderRead,
    ],
    [RoleTypes.ProviderViewer]: [
        PermissionTypes.TemplateRead,
        PermissionTypes.ProviderRead,
    ],
    [RoleTypes.User]: [
        PermissionTypes.TemplateRead,
        PermissionTypes.ProjectCreate,
        PermissionTypes.ProjectRead
    ]
};

export const roleLevels: Record<string, number> = {
    [RoleTypes.SuperAdmin]: 1,
    [RoleTypes.Admin]: 2,
    [RoleTypes.User]: 3,
};

export const providerRoleLevels: Record<string, number> = {
    [RoleTypes.ProviderOwner]: 1,
    [RoleTypes.ProviderEditor]: 2,
    [RoleTypes.ProviderViewer]: 3,
};

export const projectRoleLevels: Record<string, number> = {
    [RoleTypes.ProjectOwner]: 1,
    [RoleTypes.ProjectContributor]: 2,
    [RoleTypes.ProjectViewer]: 3,
};