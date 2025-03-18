import { ProjectManagement } from "@/lib/core/project/ProjectManagement";
import prisma from "@/lib/prisma";
import { Resource } from "@prisma/client";

export interface CustomResource extends Resource {
    deployment: {
        project: {
            uuid: string;
        };
        id: string;
    };
}

export async function getResourceInformation(resource: CustomResource){
    await prisma.deployment.findUnique({
        where: {
            id: resource.deployment.id
        },
        select: {
            template: {
                select: {
                    details: true
                }
            }
        }
    });
    const stateFile = await ProjectManagement.getProject(resource.deployment.project.uuid).terraformInstance.getModuleInformation(resource.deploymentId,"vm", "/mode");
    return stateFile;
}