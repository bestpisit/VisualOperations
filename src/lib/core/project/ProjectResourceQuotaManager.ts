import prisma from "@/lib/prisma";
import { ApiError } from "@/types/api/apiError";
import { ProjectResourceQuotaType, ResourceQuotaUsageType } from "@/types/PlatformStructure";
import { ResourceQuotaUsageTypeSchema, validateWithSchema } from "@/types/schemas/zod";
import { Project, ProjectResourceQuota, ResourceQuotaUsage } from "@prisma/client";

export class ProjectResourceQuotaManager {
    private projectId: Project['uuid'];

    constructor(projectId: Project['uuid']) {
        this.projectId = projectId;
    }

    /** Get the project quota */
    async getProjectQuota(): Promise<{projectQuota: ProjectResourceQuotaType, projectUsage: ResourceQuotaUsageType, projectQuotaObject: ProjectResourceQuota}> {
        let projectResourceQuota = await prisma.projectResourceQuota.findUnique({
            where: { projectId: this.projectId }
        });

        if (!projectResourceQuota) {
            projectResourceQuota = await prisma.projectResourceQuota.create({
                data: {
                    projectId: this.projectId,
                    quotas: {
                        cpu: 0,
                        memory: 0,
                        storage: 0
                    },
                    usage: {
                        cpu: 0,
                        memory: 0,
                        storage: 0
                    }
                }
            });
        }
        return {
            projectQuota: projectResourceQuota.quotas as ProjectResourceQuotaType,
            projectUsage: projectResourceQuota.usage as ResourceQuotaUsageType,
            projectQuotaObject: projectResourceQuota as ProjectResourceQuota
        }
    }

    /** Get the current project resource usage */
    async updateProjectResourceUsage(rsUsage?: ResourceQuotaUsage): Promise<void> {
        if (rsUsage && rsUsage.usage) {
            const projectResourceQuota = await prisma.projectResourceQuota.findUnique({
                where: { projectId: this.projectId }
            });
            const rUsage = projectResourceQuota?.usage as ResourceQuotaUsageType;
            if (!rUsage) {
                await this.getProjectQuota();
            }
            const usage = rsUsage.usage as ResourceQuotaUsageType;
            Object.keys(usage).forEach(key => {
                if (rUsage[key] === undefined) {
                    rUsage[key] = usage[key];
                }
                else {
                    rUsage[key] += usage[key];
                }
            });
            await prisma.projectResourceQuota.update({
                where: { projectId: this.projectId },
                data: { usage: rUsage }
            });
            return;
        }
        const resourceUsages = await prisma.resourceQuotaUsage.findMany({
            where: {
                resource: {
                    deployment: {
                        projectId: this.projectId
                    }
                }
            }
        });
        const usage = resourceUsages.reduce((acc, curr) => {
            validateWithSchema(ResourceQuotaUsageTypeSchema, curr.usage);
            const usage = curr.usage as ResourceQuotaUsageType;
            Object.keys(usage).forEach(key => {
                if (acc[key] === undefined) {
                    acc[key] = usage[key];
                }
                else {
                    acc[key] += usage[key];
                }
            });
            return acc;
        }, { cpu: 0, memory: 0, storage: 0 } as ResourceQuotaUsageType);
        await prisma.projectResourceQuota.update({
            where: { projectId: this.projectId },
            data: { usage }
        });
    }

    /** Validate project resource quota from deployment */
    async validateResourceQuota(usage: ResourceQuotaUsageType): Promise<void> {
        const {projectQuota, projectUsage} = await this.getProjectQuota();
        await this.updateProjectResourceUsage();
        validateWithSchema(ResourceQuotaUsageTypeSchema, usage);
        Object.keys(usage).forEach(key => {
            if (projectQuota[key] !== null && projectQuota[key] !== undefined) {
                if ((projectUsage[key] + usage[key]) > projectQuota[key]) {
                    throw ApiError.badRequest(`Resource quota exceeded for ${key} available ${projectQuota[key]-projectUsage[key]} used ${usage[key]}`); 
                }
            }
        });
    }
}
