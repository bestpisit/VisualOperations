import prisma from "@/lib/prisma"
import ProjectResourceQuotaPage from "./ProjectResourceQuotaPage";
import { ResourceQuotaUsageType } from "@/types/PlatformStructure";
import { ProjectManagement } from "@/lib/core/project/ProjectManagement";

export interface ResourceQuotaUsageCustom {
    resource: {
        name: string;
        deployment: {
            template: {
                name: string;
            };
        };
        type: string;
    };
    usage: ResourceQuotaUsageType;
}

const ProjectResourceQuota = async ({
    params
}: {
    params: { uuid: string };  // Access uuid from dynamic route
}) => {
    let projectResourceQuota = await prisma.projectResourceQuota.findUnique({
        where: {
            projectId: params.uuid
        }
    })
    if (!projectResourceQuota) {
        projectResourceQuota = (await ProjectManagement.getProject(params.uuid).projectResourceQuotaManager.getProjectQuota()).projectQuotaObject;
    }
    const resourceQuotaUsages = await prisma.resourceQuotaUsage.findMany({
        where: {
            resource: {
                deployment: {
                    projectId: params.uuid
                }
            }
        },
        select: {
            resource: {
                select: {
                    name: true,
                    type: true,
                    deployment: {
                        select: {
                            template: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            },
            usage: true
        }
    });
    return (
        <ProjectResourceQuotaPage projectResourceQuota={projectResourceQuota} resourceQuotaUsages={resourceQuotaUsages as any}/>
    )
}

export default ProjectResourceQuota