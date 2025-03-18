// lib/routes.ts
type ProjectId = string | number;

function convertProjectId(projectId: ProjectId): string {
    return typeof projectId === `number` ? projectId.toString() : projectId;
}

export const ROUTES_PATH = {
    DASHBOARD: `/dashboard`,
    PROJECTS: `/projects`,
    DEPLOYMENTS: `/deployments`,
    PROVIDERS: `/providers`,
    ADMIN: `/admin`,
    TEMPLATES: `/templates`,
}

export const ROUTES = {
    LOGIN: `/login`,
    UNAUTHORIZED: `/unauthorized`,
    DASHBOARD: '/dashboard',
    PROJECTS: ROUTES_PATH.PROJECTS,

    PROJECT: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}`,
    PROJECT_RESOURCE: (projectId: ProjectId, resourceId: string) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/resources/${resourceId}`,
    PROJECT_RESOURCE_CONFIGURATION: (projectId: ProjectId, resourceId: string) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/resources/${resourceId}/configuration`,
    PROJECT_RESOURCE_DETAILS: (projectId: ProjectId, resourceId: string) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/resources/${resourceId}/details`,
    PROJECT_DEPLOYMENTS: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/deployments`,
    PROJECT_DEPLOYMENT: (projectId: ProjectId, deploymentId: string) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/deployments/${deploymentId}`,
    PROJECT_VISUALIZATION: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/visualization`,
    PROJECT_VERSION_CONTROL: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/version-control`,
    PROJECT_VERSION: (projectId: ProjectId, version: string) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/version-control/${version}`,
    PROJECT_MEMBERS: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/members`,
    PROJECT_QUOTA: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/quota`,
    PROJECT_PROVIDERS: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/providers`,
    PROJECT_SETTINGS: (projectId: ProjectId) => `${ROUTES_PATH.PROJECTS}/${convertProjectId(projectId)}/settings`,

    DEPLOYMENT: (deploymentId: string) => `${ROUTES_PATH.DEPLOYMENTS}/deployment/${deploymentId}`,
    PROVIDERS: ROUTES_PATH.PROVIDERS,
    PROVIDER: (providerId: string) => `${ROUTES_PATH.PROVIDERS}/${providerId}`,
    PROVIDER_ACCESS_CONTROL: (providerId: string) => `${ROUTES_PATH.PROVIDERS}/${providerId}/access-control`,
    ADMIN_DASHBOARD: `${ROUTES_PATH.ADMIN}`,
    ADMIN_ACCESS_CONTROL: `${ROUTES_PATH.ADMIN}/access-control`,

    TEMPLATES: ROUTES_PATH.TEMPLATES,
    TEMPLATE: (templateId: string) => `${ROUTES_PATH.TEMPLATES}/${templateId}`,
};