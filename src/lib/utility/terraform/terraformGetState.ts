import prisma from "@/lib/prisma";
import { DeploymentTemplate, OutputConfiguration, TerraformOutput, TerraformOutputField } from "@/types/PlatformStructure";
import { Deployment } from "@prisma/client";

export function getValueFromPath(data: any, path: string): any {
    if (!path.startsWith('/')) return null; // Ensure path starts with "/"

    const keys = path.slice(1).split('/'); // Remove leading '/' and split into keys
    let result: any = data;

    for (const key of keys) {
        if (Array.isArray(result) && !isNaN(Number(key))) {
            result = result[Number(key)];
        } else if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return null; // Return null if key is not found
        }
    }

    return result;
}

export async function convertTerraformOutput(terraformOutputs: TerraformOutput) {
    const deploymentOutputs: Record<Deployment['id'], Record<string, TerraformOutputField>> = {};
    const deploymentOutputConfig: Record<Deployment['id'], OutputConfiguration> = {};
    const deploymentIdList: Deployment['id'][] = [];
    for(const key of Object.keys(terraformOutputs)){
        const [deploymentId,] = key.split(/_(.+)/, 2);
        if (!deploymentIdList.includes(deploymentId)) deploymentIdList.push(deploymentId);
    }
    for(const deploymentId of deploymentIdList){
        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
            select: {
                template: {
                    select: {
                        details: true
                    }
                }
            }
        });
        if (!deployment) continue;
        const templateDetails = deployment.template.details as unknown as DeploymentTemplate;
        if (!templateDetails.resources?.[0]?.config) {
            deploymentOutputConfig[deploymentId] = {};
            continue;
        }
        deploymentOutputConfig[deploymentId] = templateDetails.resources[0].config;
    };

    Object.keys(terraformOutputs).map(async (key) => {
        if (terraformOutputs[key]?.sensitive || !terraformOutputs[key]) return;
        const [deploymentId, variableId] = key.split(/_(.+)/, 2);
        if (!deploymentOutputConfig[deploymentId]) return;
        const fromOutput = Object.keys(deploymentOutputConfig[deploymentId]).find((output) => deploymentOutputConfig[deploymentId][output].fromOutput === variableId);
        if (!fromOutput) return;
        if (!deploymentOutputs[deploymentId]) deploymentOutputs[deploymentId] = {};
        deploymentOutputs[deploymentId][fromOutput] = terraformOutputs[key];
    });

    for (const deploymentId of deploymentIdList) {
        if (!deploymentOutputs[deploymentId]) deploymentOutputs[deploymentId] = {};
    }
    
    return deploymentOutputs;
}