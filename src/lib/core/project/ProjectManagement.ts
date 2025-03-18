import prisma from '@/lib/prisma';
import DeploymentService from './DeploymentService';
import { ProjectFolderService } from './ProjectFolderService';
import { TemplateService } from './TemplateService';
import TerraformManagementService from './TerraformManagementService';
import { ApiError } from '@/types/api/apiError';
import { ProjectResourceQuotaManager } from './ProjectResourceQuotaManager';

interface ProjectInstance {
    templateInstance: TemplateService;
    folderInstance: ProjectFolderService;
    terraformInstance: TerraformManagementService;
    deploymentInstance: DeploymentService;
    projectResourceQuotaManager: ProjectResourceQuotaManager;
}

export class ProjectManagement {
    private static projectInstances: Map<string, ProjectInstance> = new Map();

    // Get or create ProjectInstance for the project
    static getProject(projectUUID: string): ProjectInstance {
        if (!this.projectInstances.has(projectUUID)) {
            const instance = {
                templateInstance: new TemplateService(projectUUID),
                folderInstance: new ProjectFolderService(projectUUID),
                terraformInstance: new TerraformManagementService(projectUUID),
                deploymentInstance: new DeploymentService(projectUUID),
                projectResourceQuotaManager: new ProjectResourceQuotaManager(projectUUID)
            };
            this.projectInstances.set(projectUUID, instance);
            console.log(`ProjectInstance created for project: ${projectUUID}`);
        }
        return this.projectInstances.get(projectUUID)!;
    }

    // Remove instance when the project is no longer needed
    static async removeProject(projectUUID: string) {
        const project = await prisma.project.findUnique({
            where: {
                uuid: projectUUID
            }
        });
        if (!project) {
            throw ApiError.notFound('Project not found');
        }
        //check project resource must be zero
        const resourceCount = await prisma.resource.count({
            where: {
                deployment: {
                    projectId: projectUUID
                }
            }
        });
        if (resourceCount > 0) {
            throw ApiError.badRequest('Project has resources, please delete them first');
        }
        if (this.projectInstances.delete(projectUUID)) {
            console.log(`ProjectInstance removed for project: ${projectUUID}`);
        }
    }
}