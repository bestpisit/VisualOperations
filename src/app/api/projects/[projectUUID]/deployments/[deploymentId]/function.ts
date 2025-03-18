import prisma from "@/lib/prisma";
import { DeploymentConfiguration } from "@/types/PlatformStructure";
import { Deployment } from "@prisma/client";

export interface CustomGetDeployment {
    name: string | null;
    id: string;
    status: string;
    active: boolean;
    destroy: boolean;
    planOutput: any;
    updatedAt: Date;
    preDeploymentState: any;
    postDeploymentState: any;
    user: {
        name: string | null;
    };
    project: {
        name: string;
    };
    config: DeploymentConfiguration;
};

export const getDeployment = async (deploymentId: Deployment['id']) => {
    const deployment = await prisma.deployment.findUnique({
        where: {
            id: deploymentId
        },
        select: {
            id: true,
            name: true,
            status: true,
            destroy: true,
            updatedAt: true,
            active: true,
            preDeploymentState: true,
            postDeploymentState: true,
            planOutput: true,
            user: {
                select: {
                    name: true
                }
            },
            project: {
                select: {
                    name: true
                }
            },
            config: true
        }
    }) as CustomGetDeployment;
    return deployment;
}