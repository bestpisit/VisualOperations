import path from 'path';
import fs from 'fs';
import { DeploymentConfiguration, DeploymentStatus, DeploymentTemplate, DeploymentType, InputField, InputTypes, PlatformPaths, PlatformStructure, ProviderConfiguration, ProviderTemplate } from '@/types/PlatformStructure';
import prisma from '@/lib/prisma';
import { Project, Provider } from '@prisma/client';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import { JsonObject } from '@prisma/client/runtime/library';
import { CustomDeployment } from './DeploymentService';
import { ApiError } from '@/types/api/apiError';
import { convertRegexToTerraform } from '@/lib/utils';
import { cidrToRegex } from '@/lib/utility/cidr/cidrToRegex';
import { getValueFromPath } from '@/lib/utility/terraform/terraformGetState';
import { deploymentConfigurationSchema, deploymentTemplateSchema, inputFieldSchema, outputFieldSchema, providerConfigurationSchema, providerTemplateSchema, validateWithSchema } from '@/types/schemas/zod';
import { z } from 'zod';

class TerraformManagementService {
    private workingDir: string;
    private projectUUID: string;

    constructor(projectUUID: string) {
        this.projectUUID = projectUUID;
        this.workingDir = path.join(PlatformPaths.PROJECTS, projectUUID, PlatformStructure.TerraformFolder);
        this.ensureTerraformFolderExists();
    }

    private async ensureTerraformFolderExists(): Promise<void> {
        if (!fs.existsSync(this.workingDir)) {
            await fs.mkdirSync(this.workingDir, { recursive: true });
            console.log(`Terraform folder created at: ${this.workingDir}`);
        }
        this.createDeploymentFolders();
    }

    private async createDeploymentFolders() {
        for (const type of Object.values(DeploymentType)) {
            const typeFolder = path.join(this.workingDir, type);
            if (!fs.existsSync(typeFolder)) {
                await fs.promises.mkdir(typeFolder, { recursive: true });
                console.log(`Deployment type folder created at: ${typeFolder}`);
            }
            this.createBackendFile(typeFolder);
        }
    }

    private createBackendFile(folder: string): void {
        const backendFilePath = path.join(folder, 'backend.tf');
        const backendContent = `terraform {
  backend "local" {
    path = "./terraform.tfstate"
  }
}`;

        if (!fs.existsSync(backendFilePath)) {
            fs.writeFileSync(backendFilePath, backendContent);
            console.log(`backend.tf file created at: ${backendFilePath}`);
        } else {
            console.log(`backend.tf already exists at: ${backendFilePath}`);
        }
    }

    public async getModuleInformation(
        deploymentId: string,
        name: string,
        query?: string
    ): Promise<any | null> {
        const stateFilePath = path.join(this.workingDir, 'terraform.tfstate');

        if (!fs.existsSync(stateFilePath)) {
            return null;
        }

        const stateFile = await fs.promises.readFile(stateFilePath, 'utf-8');
        const stateJson = JSON.parse(stateFile);

        const modules = stateJson?.resources?.find(
            (resource: any) => resource.module === `module.${deploymentId}` && resource.name === name
        );

        if (!modules) {
            return null;
        }

        // If no query provided, return the full module object
        if (!query) {
            return modules;
        }

        // Extract specific value based on query
        return getValueFromPath(module, query);
    }

    public async generateDataFile(deploymentType: DeploymentType): Promise<void> {
        const dataFilePath = path.join(this.workingDir, deploymentType, 'data.tf');
        const projectDeployments = await prisma.deployment.findMany({
            where: {
                projectId: this.projectUUID,
                type: deploymentType,
            },
            include: {
                template: {
                    select: {
                        details: true
                    }
                }
            }
        });

        const deployments = projectDeployments.filter((deployment) => {
            // 1. Check Special Not-Delete Condition
            if (
                deployment.active === false &&
                deployment.destroy === false &&
                deployment.status === DeploymentStatus.Completed
            ) {
                const parentDeployment = projectDeployments.find(
                    (d) => d.id === deployment.parentDeploymentId
                );

                if (
                    parentDeployment &&
                    parentDeployment.active === true &&
                    parentDeployment.destroy === true &&
                    !(
                        parentDeployment.status === DeploymentStatus.Completed ||
                        parentDeployment.status === DeploymentStatus.Running ||
                        parentDeployment.status === DeploymentStatus.Planning
                    )
                ) {
                    // It's a "special" not-delete; keep it
                    return true;
                }
            }

            // 2. Check Usual Not-Delete Condition
            const isUsualNotDelete =
                deployment.destroy === false &&
                deployment.active === true &&
                (deployment.status === DeploymentStatus.Completed ||
                    deployment.status === DeploymentStatus.Running ||
                    deployment.status === DeploymentStatus.Planning );

            return isUsualNotDelete;
        });

        const dataBlocks = {} as Record<Project['uuid'], DeploymentType[]>;
        for (const deployment of deployments) {
            const deploymentTemplateDetails = parsePrismaJson(deployment.template.details) as unknown as DeploymentTemplate;

            if (!deploymentTemplateDetails) {
                console.error(`Template details not found for deployment with id ${deployment.id}`);
                return;
            }
            validateWithSchema(deploymentTemplateSchema, deploymentTemplateDetails);

            validateWithSchema(z.array(inputFieldSchema), deploymentTemplateDetails.inputs);

            const inputs = deploymentTemplateDetails.inputs;

            if (!inputs) {
                throw ApiError.badRequest(`Inputs not found for deployment with id ${deployment.id}`);
            }

            const deploymentConfig = parsePrismaJson(deployment.config) as DeploymentConfiguration;
            validateWithSchema(deploymentConfigurationSchema, deploymentConfig);

            for (const input of inputs) {
                if (input.type === InputTypes.Resource) {
                    const resourceId = deploymentConfig[input.name]?.value;
                    if (input.required && !resourceId) {
                        throw ApiError.badRequest(`Resource input ${input.name} is required`);
                    }
                    else if (!input.required && !resourceId) {
                        continue;
                    }
                    const resource = await prisma.resource.findUnique({
                        where: {
                            uuid: resourceId
                        },
                        include: {
                            deployment: {
                                select: {
                                    projectId: true,
                                    type: true,
                                    id: true
                                }
                            },
                            Provider: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    });
                    if (!resource) {
                        throw ApiError.badRequest(`Resource with id ${resourceId} not found`);
                    }
                    if (resource.deployment.projectId !== this.projectUUID) {
                        if (resource.Provider.length > 0) {
                            let pass = false;
                            for (const provider of resource.Provider) {
                                const projectProviders = await prisma.provider.findMany({
                                    where: {
                                        id: provider.id,
                                        ProjectProvider: {
                                            some: {
                                                project: {
                                                    uuid: this.projectUUID
                                                }
                                            }
                                        }
                                    }
                                });
                                if (projectProviders.length === 0) {
                                    throw ApiError.notFound(`Provider with id ${provider.id} not found in this project`);
                                }
                                pass = true;
                                if (!dataBlocks[resource.deployment.projectId]) dataBlocks[resource.deployment.projectId] = [];
                                if (!dataBlocks[resource.deployment.projectId].includes(resource.deployment.type as DeploymentType)) dataBlocks[resource.deployment.projectId].push(resource.deployment.type as DeploymentType);
                            }
                            if (pass) break;
                        }
                        throw ApiError.badRequest(`Resource with id ${resourceId} not found in this project`);
                    }
                    if (resource.deployment.type !== deployment.type) {
                        if (!dataBlocks[resource.deployment.projectId]) dataBlocks[resource.deployment.projectId] = [];
                        if (!dataBlocks[resource.deployment.projectId].includes(resource.deployment.type as DeploymentType)) dataBlocks[resource.deployment.projectId].push(resource.deployment.type as DeploymentType);
                    }
                    break;
                }
            }
        }

        const deploymentsProvider = deployments.map(d => d.providerId).reduce((acc: string[], provider) => {
            if (provider && !acc.includes(provider)) {
                acc.push(provider);
            }
            return acc;
        }, []);

        const projectProviders = await prisma.provider.findMany({
            where: {
                uuid: {
                    in: deploymentsProvider
                },
                ProjectProvider: {
                    some: {
                        project: {
                            uuid: this.projectUUID
                        }
                    }
                }
            }
        });

        for (const provider of projectProviders) {
            const providerConfig = parsePrismaJson(provider.config) as ProviderConfiguration;
            validateWithSchema(providerConfigurationSchema, providerConfig);

            for (const key in providerConfig) {
                if (providerConfig[key].type === InputTypes.Resource) {
                    const resourceId = providerConfig[key].value;
                    const resource = await prisma.resource.findUnique({
                        where: {
                            uuid: resourceId
                        },
                        include: {
                            deployment: {
                                select: {
                                    projectId: true,
                                    type: true,
                                    id: true
                                }
                            },
                            Provider: {
                                select: {
                                    id: true
                                }
                            }
                        }
                    });
                    if (!resource) {
                        throw ApiError.badRequest(`Resource with id ${resourceId} not found`);
                    }
                    if (resource.deployment.projectId !== this.projectUUID) {
                        if (resource.Provider.length > 0) {
                            let pass = false;
                            for (const provider of resource.Provider) {
                                const projectProviders = await prisma.provider.findMany({
                                    where: {
                                        id: provider.id,
                                        ProjectProvider: {
                                            some: {
                                                project: {
                                                    uuid: this.projectUUID
                                                }
                                            }
                                        }
                                    }
                                });
                                if (projectProviders.length === 0) {
                                    throw ApiError.notFound(`Provider with id ${provider.id} not found in this project`);
                                }
                                pass = true;
                                if (!dataBlocks[resource.deployment.projectId]) dataBlocks[resource.deployment.projectId] = [];
                                if (!dataBlocks[resource.deployment.projectId].includes(resource.deployment.type as DeploymentType)) dataBlocks[resource.deployment.projectId].push(resource.deployment.type as DeploymentType);
                            }
                            if (pass) break;
                        }
                        throw ApiError.badRequest(`Resource with id ${resourceId} not found in this project`);
                    }
                    if (resource.deployment.type !== deploymentType) {
                        if (!dataBlocks[resource.deployment.projectId]) dataBlocks[resource.deployment.projectId] = [];
                        if (!dataBlocks[resource.deployment.projectId].includes(resource.deployment.type as DeploymentType)) dataBlocks[resource.deployment.projectId].push(resource.deployment.type as DeploymentType);
                    }
                    break;
                }
            }
        }

        if (Object.entries(dataBlocks).length > 0) {
            const dataContent = Object.entries(dataBlocks).map(
                type => {
                    return type[1].map(t => `data "terraform_remote_state" "${type[0]}-${t}-state" {
    backend = "local"
    config = {
        path = "../../../${type[0]}/terraform/${t}/terraform.tfstate"
    }
}`)
                }
            ).join('\n\n');

            //write file
            await fs.promises.writeFile(dataFilePath, dataContent, 'utf-8');
        }
    }

    public async generateOutputFile(deploymentType: DeploymentType): Promise<void> {
        const outputFilePath = path.join(this.workingDir, deploymentType, 'outputs.tf');
        const projectDeployments = await prisma.deployment.findMany({
            where: {
                projectId: this.projectUUID,
                type: deploymentType,
            },
            include: {
                template: {
                    select: {
                        details: true
                    }
                }
            }
        });

        const deployments = projectDeployments.filter((deployment) => {
            // 1. Check Special Not-Delete Condition
            if (
                deployment.active === false &&
                deployment.destroy === false &&
                deployment.status === DeploymentStatus.Completed
            ) {
                const parentDeployment = projectDeployments.find(
                    (d) => d.id === deployment.parentDeploymentId
                );

                if (
                    parentDeployment &&
                    parentDeployment.active === true &&
                    parentDeployment.destroy === true &&
                    !(
                        parentDeployment.status === DeploymentStatus.Completed ||
                        parentDeployment.status === DeploymentStatus.Running ||
                        parentDeployment.status === DeploymentStatus.Planning
                    )
                ) {
                    // It's a "special" not-delete; keep it
                    return true;
                }
            }

            // 2. Check Usual Not-Delete Condition
            const isUsualNotDelete =
                deployment.destroy === false &&
                deployment.active === true &&
                (deployment.status === DeploymentStatus.Completed ||
                    deployment.status === DeploymentStatus.Running);

            return isUsualNotDelete;
        });

        const outputBlocks = deployments.map((deployment) => {
            const deploymentTemplateDetails = parsePrismaJson(deployment.template.details) as unknown as DeploymentTemplate;
            if (!deploymentTemplateDetails) {
                console.error(`Template details not found for deployment with id ${deployment.id}`);
                return;
            }
            if (!deploymentTemplateDetails.outputs) {
                return;
            }
            validateWithSchema(z.array(outputFieldSchema), deploymentTemplateDetails.outputs);

            const outputs = deploymentTemplateDetails.outputs;

            if (!outputs) {
                return null;
            }

            return outputs.map((output) => {
                const block = `output "${deployment.id}_${output.name}" {
    value     = module.${deployment.id}.${output.name}
    sensitive = ${output.sensitive}
}`;
                return block;
            }
            ).join('\n\n');
        }
        ).filter(Boolean).join('\n\n');

        if (!outputBlocks) {
            console.log(`No outputs found for deployment type ${deploymentType}`);
            if (fs.existsSync(outputFilePath)) {
                try {
                    await fs.promises.unlink(outputFilePath);
                    console.log(`File ${outputFilePath} was deleted successfully.`);
                } catch (err) {
                    console.error(`Error deleting file ${outputFilePath}:`, err);
                }
            }
            return;
        }

        // Write to file
        await fs.promises.writeFile(outputFilePath, outputBlocks, 'utf-8');
        console.log(`✅ Outputs file updated at: ${outputFilePath}`);
    }

    public async generateProviderFile(deploymentType: DeploymentType): Promise<void> {
        const providersFilePath = path.join(this.workingDir, deploymentType, 'providers.tf');
        const terraformProviderFilePath = path.join(this.workingDir, deploymentType, 'terraform.tf');
        const deployment = await prisma.deployment.findMany({
            where: {
                projectId: this.projectUUID,
                type: deploymentType,
            },
        });
        const deploymentsProvider = deployment.map(d => d.providerId).reduce((acc: string[], provider) => {
            if (provider && !acc.includes(provider)) {
                acc.push(provider);
            }
            return acc;
        }, []);
        const projectProviders = await prisma.provider.findMany({
            where: {
                uuid: {
                    in: deploymentsProvider
                },
                ProjectProvider: {
                    some: {
                        project: {
                            uuid: this.projectUUID
                        }
                    }
                }
            }
        });
        const terraformProviders = await prisma.terraformProvider.findMany(
            {
                where: {
                    id: {
                        in: projectProviders.map(pp => pp.terraformProviderId).reduce((acc: Provider['terraformProviderId'][], provider) => {
                            if (!acc.some(item => item === provider)) {
                                acc.push(provider);
                            }
                            return acc;
                        }, [])
                    }
                }
            }
        );
        // Generate provider blocks
        const providerBlocks = [] as string[];
        for (const provider of projectProviders) {
            const terraformProvider = terraformProviders.find(tp => tp.id === provider.terraformProviderId);
            if (!terraformProvider) {
                throw ApiError.badRequest(`Terraform provider with id ${provider.terraformProviderId} not found`);
            }
            const terraformDetails = parsePrismaJson(terraformProvider.details) as unknown as ProviderTemplate;

            validateWithSchema(providerTemplateSchema, terraformDetails);

            if (!terraformDetails) {
                throw ApiError.badRequest(`Terraform provider details not found for provider with id ${provider.terraformProviderId}`);
            }

            // Safely extract inputs and filter to ensure correct typing
            const inputs = terraformDetails.inputs as InputField[];
            const providerConfig = parsePrismaJson(provider.config) as ProviderConfiguration;

            validateWithSchema(z.array(inputFieldSchema), inputs);

            // Map inputs to Terraform variable references
            const vars = [] as string[];
            for (const input of inputs) {
                if (input.configuration || input.type === InputTypes.Resource || input.type === InputTypes.Providers) continue;
                if (input.validation?.from && input.validation?.reference && input.validation?.import) {
                    const fromInput = inputs.find(i => i.name === input.validation.from);
                    if (fromInput?.type === InputTypes.Resource) {
                        const resourceId = providerConfig[input.validation.from]?.value;
                        const resource = await prisma.resource.findUnique({
                            where: {
                                uuid: resourceId
                            },
                            include: {
                                deployment: {
                                    select: {
                                        projectId: true,
                                        type: true,
                                        id: true
                                    }
                                },
                                Provider: {
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        });
                        if (!resource) {
                            throw ApiError.badRequest(`Resource with id ${resourceId} not found`);
                        }
                        if (resource.deployment.projectId !== this.projectUUID) {
                            if (resource.Provider.length > 0) {
                                let pass = false;
                                for (const provider of resource.Provider) {
                                    const projectProviders = await prisma.provider.findMany({
                                        where: {
                                            id: provider.id,
                                            ProjectProvider: {
                                                some: {
                                                    project: {
                                                        uuid: this.projectUUID
                                                    }
                                                }
                                            }
                                        }
                                    });
                                    if (projectProviders.length === 0) {
                                        throw ApiError.notFound(`Provider with id ${provider.id} not found in this project`);
                                    }
                                    pass = true;
                                    if (resource.deployment.type !== deploymentType) {
                                        if (input.type === InputTypes.File) {
                                            vars.push(`  ${input?.name} = file(data.terraform_remote_state.${resource.deployment.projectId}-${resource.deployment.type}-state.outputs.${resource.deployment.id}_${input.validation.reference})`);
                                            continue;
                                        }
                                        vars.push(`  ${input?.name} = data.terraform_remote_state.${resource.deployment.projectId}-${resource.deployment.type}-state.outputs.${resource.deployment.id}_${input.validation.reference}`);
                                        continue;
                                    }
                                    else {
                                        if (input.type === InputTypes.File) {
                                            vars.push(`  ${input?.name} = file(module.${resource.deployment.id}.${input.validation.reference})`);
                                            continue;
                                        }
                                        vars.push(`  ${input?.name} = module.${resource.deployment.id}.${input.validation.reference}`);
                                        continue;
                                    }
                                }
                                if (pass) continue;
                            }
                            throw ApiError.badRequest(`Resource with id ${resourceId} not found in this project`);
                        }
                        if (resource.deployment.type !== deploymentType) {
                            if (input.type === InputTypes.File) {
                                vars.push(`  ${input?.name} = file(data.terraform_remote_state.${resource.deployment.projectId}-${resource.deployment.type}-state.outputs.${resource.deployment.id}_${input.validation.reference})`);
                                continue;
                            }
                            vars.push(`  ${input?.name} = data.terraform_remote_state.${resource.deployment.projectId}-${resource.deployment.type}-state.outputs.${resource.deployment.id}_${input.validation.reference}`);
                            continue;
                        }
                        else {
                            if (input.type === InputTypes.File) {
                                vars.push(`  ${input?.name} = file(module.${resource.deployment.id}.${input.validation.reference})`);
                                continue;
                            }
                            vars.push(`  ${input?.name} = module.${resource.deployment.id}.${input.validation.reference}`);
                            continue;
                        }
                    }
                }
                if (input.type === InputTypes.File) {
                    vars.push(`  ${input.name} = file(var.${provider.uuid}_${input.name})`);
                    continue;
                }
                vars.push(`  ${input.name} = var.${provider.uuid}_${input.name}`);
            }

            providerBlocks.push(`provider "${terraformDetails.id}" {
  alias = "${provider.uuid}"
${vars.join('\n')}
}`);
        }

        const providersContent = providerBlocks.join('\n\n');

        // Generate required_providers block
        const terraformBlocks = terraformProviders.map(provider => {
            const terraformDetails = parsePrismaJson(provider.details) as JsonObject;

            if (!terraformDetails || !terraformDetails.terraform) {
                return null;
                // throw new Error(`Terraform block not found for provider with id ${provider.id}`);
            }

            const terraformConfig = terraformDetails.terraform as { source: string; version: string };

            return `    ${terraformDetails.id} = {
      source  = "${terraformConfig.source}"
      version = "${terraformConfig.version}"
    }`;
        }).join('\n');

        // Write to providers.tf file
        if (providersContent.replace(/[a-zA-Z0-9\s]/g, "") !== "") {
            await fs.promises.writeFile(providersFilePath, providersContent, 'utf-8');
        }
        else {
            if (fs.existsSync(providersFilePath)) {
                await fs.unlinkSync(providersFilePath);
            }
        }

        if (terraformBlocks) {
            const terraformContent = `terraform {
  required_providers {
${terraformBlocks}
  }
}`;
            await fs.promises.writeFile(terraformProviderFilePath, terraformContent, 'utf-8');
        }

        await this.generateVariablesFile(deploymentType);
    }

    public async generateVariablesFile(deploymentType: DeploymentType): Promise<void> {
        const variablesFilePath = path.join(this.workingDir, deploymentType, 'variables.tf');

        const deployment = await prisma.deployment.findMany({
            where: {
                projectId: this.projectUUID,
                type: deploymentType,
            },
        });
        const deploymentsProvider = deployment.map(d => d.providerId).reduce((acc: string[], provider) => {
            if (provider && !acc.includes(provider)) {
                acc.push(provider);
            }
            return acc;
        }, []);

        // Get all providers for this project
        const projectProviders = await prisma.provider.findMany({
            where: {
                ProjectProvider: {
                    some: {
                        project: {
                            uuid: this.projectUUID
                        }
                    }
                },
                uuid: {
                    in: deploymentsProvider
                }
            }
        });

        const terraformProviderIds = projectProviders.reduce<string[]>((acc, provider) => {
            if (!acc.includes(provider.terraformProviderId)) {
                acc.push(provider.terraformProviderId);
            }
            return acc;
        }, []);

        const terraformProviders = await prisma.terraformProvider.findMany({
            where: {
                id: { in: terraformProviderIds }
            }
        });

        const terraformProviderMap = new Map<string, any>();
        terraformProviders.forEach(tp => {
            terraformProviderMap.set(tp.id, tp);
        });

        // Generate variable blocks for project providers
        const variableBlocks = projectProviders
            .map((provider) => {
                const terraformProvider = terraformProviderMap.get(provider.terraformProviderId);
                if (!terraformProvider) {
                    throw new Error(`Terraform provider with id ${provider.terraformProviderId} not found`);
                }

                const terraformDetails = parsePrismaJson(terraformProvider.details) as JsonObject;
                if (!terraformDetails) {
                    throw new Error(`Terraform provider details not found for provider with id ${provider.terraformProviderId}`);
                }

                const inputs = Array.isArray(terraformDetails.inputs)
                    ? terraformDetails.inputs.filter((input): input is { name: string; type: string; description?: string; default?: any; secret?: any; validation?: any; configuration?: boolean } =>
                        typeof input === 'object' && input !== null && 'name' in input && 'type' in input)
                    : [];

                return inputs.filter(input => !input.configuration && !input.validation?.import && input.type !== InputTypes.Resource && input.type !== InputTypes.Providers).map((input) => {
                    const varName = `${provider.uuid}_${input.name}`;
                    let varType = input.type;
                    const varSensitive = !!input.secret;

                    let regex = false;

                    if (varType === 'boolean') {
                        varType = 'bool';
                    } else if (varType === 'number') {
                        varType = 'number';
                    } else if (varType === 'list') {
                        varType = 'list(string)';
                    } else if (varType === InputTypes.Map) {
                        varType = 'map(string)';
                    } else if (varType === 'regex') {
                        varType = 'string';
                        regex = true;
                    } else {
                        varType = 'string';
                    }

                    let block = `variable "${varName}" {\n  type        = ${varType}\n`;
                    if (input.description) {
                        block += `  description = "${input.description}"\n`;
                    }
                    if (typeof input.default !== 'undefined') {
                        block += typeof input.default === 'string'
                            ? `  default     = "${input.default}"\n`
                            : `  default     = ${input.default}\n`;
                    }
                    if (varSensitive) {
                        block += `  sensitive   = true\n`;
                    }
                    if (regex) {
                        block += `  validation {
    condition     = can(regex("${input?.validation?.regex ? convertRegexToTerraform(input?.validation?.regex) : '.*'}", var.${varName}))
    error_message = "${input?.validation?.error_message}"
    }\n`;
                        //                 block += `  validation {
                        // condition     = can(regex("${input?.validation?.regex ? convertRegexToTerraform(cidrToRegex(providerConfig[input.name]?.value as string)): '.*'}"), var.${varName})
                        // error_message = "IP must follow CIDR ${providerConfig[input.name]?.value}"
                        // }\n`;
                        // block += `  default     = "${input?.validation?.regex ? convertRegexToTerraform(cidrToRegex(providerConfig[input.name]?.value as string)): '.*'}"\n`;
                    }
                    block += `}`;
                    return block;
                }).join('\n\n');
            })
            .filter(Boolean)
            .join('\n\n');

        const projectDeployments = await prisma.deployment.findMany({
            where: {
                projectId: this.projectUUID,
                type: deploymentType
            },
            include: {
                template: {
                    select: {
                        details: true,
                        TemplateProviders: {
                            select: { providerId: true }
                        }
                    }
                }
            }
        });

        const deployments = projectDeployments.filter((deployment) => {
            // 1. Check Special Not-Delete Condition
            if (
                deployment.active === false &&
                deployment.destroy === false &&
                deployment.status === DeploymentStatus.Completed
            ) {
                const parentDeployment = projectDeployments.find(
                    (d) => d.id === deployment.parentDeploymentId
                );

                if (
                    parentDeployment &&
                    parentDeployment.active === true &&
                    parentDeployment.destroy === true &&
                    !(
                        parentDeployment.status === DeploymentStatus.Completed ||
                        parentDeployment.status === DeploymentStatus.Running ||
                        parentDeployment.status === DeploymentStatus.Planning
                    )
                ) {
                    // It's a "special" not-delete; keep it
                    return true;
                }
            }

            // 2. Check Usual Not-Delete Condition
            const isUsualNotDelete =
                deployment.destroy === false &&
                deployment.active === true &&
                (deployment.status === DeploymentStatus.Completed ||
                    deployment.status === DeploymentStatus.Running ||
                    deployment.status === DeploymentStatus.Planning );

            return isUsualNotDelete;
        });

        const deploymentVariableBlocks = deployments
            .map((deployment) => {
                const deploymentTemplateDetails = parsePrismaJson(deployment.template.details) as JsonObject;
                if (!deploymentTemplateDetails) {
                    console.error(`Template details not found for deployment with id ${deployment.id}`);
                    return;
                }

                const inputs = Array.isArray(deploymentTemplateDetails.inputs)
                    ? deploymentTemplateDetails.inputs.filter((input): input is { name: string; type: string; description?: string; default?: any; secret?: any; validation?: any; dummy?: boolean } =>
                        typeof input === 'object' && input !== null && 'name' in input && 'type' in input)
                    : [] as Array<{ name: string; type: string; description?: string; default?: any; secret?: any; validation?: any; dummy?: boolean }>;

                const deploymentConfig = parsePrismaJson(deployment.config) as any;

                const inputVars = [] as string[];

                for (const input of inputs) {
                    if (input.type === InputTypes.Providers || input.type === InputTypes.Resource || input.validation?.import || input.dummy) continue;
                    const varName = `${deployment.id}_${input.name}`;
                    let varType = input.type;
                    const varSensitive = !!input.secret;

                    if (varType === 'boolean') {
                        varType = 'bool';
                    } else if (varType === 'number') {
                        varType = 'number';
                    } else if (varType === InputTypes.Regex) {
                        varType = 'string';
                    } else if (varType === InputTypes.Map) {
                        varType = 'map(string)';
                    }
                    else {
                        varType = 'string';
                    }

                    let block = `variable "${varName}" {\n  type        = ${varType}\n`;
                    if (input.description) {
                        block += `  description = "${input.description}"\n`;
                    }
                    if (typeof input.default !== 'undefined') {
                        block += typeof input.default === 'string'
                            ? `  default     = "${input.default}"\n`
                            : `  default     = ${input.default}\n`;
                    }
                    if (varSensitive) {
                        block += `  sensitive   = true\n`;
                    }
                    if (input.validation?.from && input.validation?.reference) {
                        const fromInput = inputs.find(i => i.name === input.validation.from);
                        if (fromInput?.type === InputTypes.Providers) {
                            const provider = projectProviders.find(p => p.uuid === deploymentConfig[input.validation.from]?.value);
                            if (provider) {
                                const providerConfig = (parsePrismaJson(provider.config) as ProviderConfiguration)[input.validation.reference];
                                if (providerConfig.type === InputTypes.Regex) {
                                    block += `  validation {
    condition     = can(regex("${providerConfig?.value ? convertRegexToTerraform(cidrToRegex(providerConfig?.value)) : '.*'}", var.${varName}))
    error_message = "IP must follow CIDR ${providerConfig?.value}"
}\n`;
                                }
                            }
                        }
                    }
                    block += `}`;
                    inputVars.push(block);
                }

                return inputVars.join('\n\n');
            })

        const finalVariableContent = [variableBlocks, ...deploymentVariableBlocks].filter(Boolean).join('\n\n');

        // Write to file
        await fs.promises.writeFile(variablesFilePath, finalVariableContent, 'utf-8');
        console.log(`✅ Variables file updated at: ${variablesFilePath}`);
    }

    public async deleteAllDeploymentFiles(deploymentType: DeploymentType): Promise<void> {
        const projectDeployments = await prisma.deployment.findMany({
            where: {
                project: {
                    uuid: this.projectUUID
                },
                type: deploymentType
            }
        });

        for (const deployment of projectDeployments) {
            const deploymentFilePath = path.join(this.workingDir, deploymentType, deployment.id + '.tf');
            if (fs.existsSync(deploymentFilePath)) {
                try {
                    // Delete the file
                    fs.unlinkSync(deploymentFilePath);
                    console.log(`File ${deploymentFilePath} was deleted successfully.`);
                } catch (err) {
                    console.error(`Error deleting file ${deploymentFilePath}:`, err);
                }
            }
        }
    }

    public async deleteDeploymentFile(deploymentId: string): Promise<void> {
        const deployment = await prisma.deployment.findUnique({
            where: {
                id: deploymentId
            }
        });
        if (!deployment) {
            throw ApiError.notFound(`Deployment with id ${deploymentId} not found`);
        }
        const deploymentFilePath = path.join(this.workingDir, deployment.type, deploymentId + '.tf');
        if (fs.existsSync(deploymentFilePath)) {
            try {
                // Delete the file
                fs.unlinkSync(deploymentFilePath);
                console.log(`File ${deploymentFilePath} was deleted successfully.`);
            } catch (err) {
                console.error(`Error deleting file ${deploymentFilePath}:`, err);
            }
        }
    }

    public async generateDeploymentFile(deployment: CustomDeployment): Promise<void> {
        const deploymentFilePath = path.join(this.workingDir, deployment.type, deployment.id + '.tf');

        // This is inactive deployment, delete the file
        if (!(deployment.destroy === false && deployment.active === true && (deployment.status === DeploymentStatus.Completed || deployment.status === DeploymentStatus.Running || deployment.status === DeploymentStatus.Planning))) {
            //potential fixed
            if (deployment.valid) {

            }
            else {
                // console.log(`Deployment ${deployment.id} is inactive, deleting file ${deploymentFilePath}`);
                // Check if the file exists
                if (fs.existsSync(deploymentFilePath)) {
                    try {
                        // Delete the file
                        await fs.unlinkSync(deploymentFilePath);
                        console.log(`File ${deploymentFilePath} was deleted successfully.`);
                    } catch (err) {
                        console.error(`Error deleting file ${deploymentFilePath}:`, err);
                    }
                }
                return;
            }
        }

        const deploymentConfig = parsePrismaJson(deployment.config) as DeploymentConfiguration;

        validateWithSchema(deploymentConfigurationSchema, deploymentConfig);

        let providerTerraform = true;

        // Extract providers
        const providers = await Promise.all(
            deployment.template.TemplateProviders.map(async (provider) => {
                const providerKey = `provider_${provider.providerId}`;
                const providerValue = deploymentConfig[providerKey] as DeploymentConfiguration[string];

                const terraformProvider = await prisma.terraformProvider.findUnique({
                    where: {
                        id: provider.providerId,
                    },
                });
                if (!terraformProvider) {
                    throw new Error(`Terraform provider with id ${provider.providerId} not found`);
                }

                const terraformProviderConfig = parsePrismaJson(terraformProvider.details) as JsonObject;
                if (!terraformProviderConfig.terraform) {
                    providerTerraform = false;
                    return null;
                }

                if (!providerValue) {
                    throw new Error(`Provider ID '${provider.providerId}' not found in deployment config.`);
                }

                return `    ${provider.providerId} = ${provider.providerId}.${providerValue.value}`;
            })
        );

        const providersBlock = providers && providers.length > 0 && providerTerraform ? `
        providers = {
${providers}
    }
` : '';

        validateWithSchema(z.array(inputFieldSchema), deployment.template.details.inputs);

        // Safely extract inputs and map them to Terraform variables
        const inputs = deployment.template.details.inputs as unknown as InputField[];

        // Map inputs to Terraform variable references
        const vars = [] as string[];
        for (const input of inputs) {
            if (input.type === InputTypes.Providers || input.type === InputTypes.Resource || input.dummy) continue;
            if (input.validation?.from && input.validation?.reference && input.validation?.import) {
                const fromInput = inputs.find(i => i.name === input.validation.from);
                if (fromInput?.type === InputTypes.Resource && !fromInput?.required && !deploymentConfig[input.validation.from]?.value) {
                    continue;
                }
                if (fromInput?.type === InputTypes.Providers) {
                    const projectProviders = await prisma.provider.findMany({
                        where: {
                            ProjectProvider: {
                                some: {
                                    project: {
                                        uuid: this.projectUUID
                                    }
                                }
                            }
                        }
                    });
                    const provider = projectProviders.find(p => p.uuid === deploymentConfig[input.validation.from]?.value);
                    if (provider) {
                        const providerConfig = (parsePrismaJson(provider.config) as ProviderConfiguration)[input.validation.reference];
                        if (!!providerConfig) {
                            vars.push(`  ${input?.name} = var.${provider.uuid}_${input.validation.reference}`);
                            continue;
                        }
                        else {
                            throw new Error(`Provider with id ${deploymentConfig[input.validation.from]?.value} not found`);
                        }
                    }
                    else {
                        throw new Error(`Provider with id ${deploymentConfig[input.validation.from]?.value} not found`);
                    }
                }
                else if (fromInput?.type === InputTypes.Resource) {
                    const resourceId = deploymentConfig[input.validation.from]?.value;
                    const resource = await prisma.resource.findUnique({
                        where: {
                            uuid: resourceId
                        },
                        include: {
                            deployment: {
                                select: {
                                    projectId: true,
                                    type: true,
                                    id: true
                                }
                            }
                        }
                    });
                    if (!resource) {
                        throw new Error(`Resource with id ${resourceId} not found`);
                    }
                    if (resource.deployment.projectId !== this.projectUUID) {
                        throw new Error(`Resource with id ${resourceId} not found in this project`);
                    }
                    if (resource.deployment.type !== deployment.type) {
                        vars.push(`  ${input?.name} = data.terraform_remote_state.${resource.deployment.projectId}-${resource.deployment.type}-state.outputs.${resource.deployment.id}_${input.validation.reference}`);
                        continue;
                    }
                    else {
                        vars.push(`  ${input?.name} = module.${resource.deployment.id}.${input.validation.reference}`);
                        continue;
                    }
                }
            }
            vars.push(`  ${input?.name} = var.${deployment.id}_${input.name}`);
        }

        // Generate Terraform Module Content
        const terraformContent = `
module "${deployment.id}" {
  source = "../../modules/${deployment.templateId}/terraform"
  ${providersBlock}
${vars.join('\n')}
}
        `;

        // Write to File
        try {
            await fs.promises.writeFile(deploymentFilePath, terraformContent.trim());
            console.log(`✅ Deployment file created: ${deploymentFilePath}`);
        } catch (error: any) {
            throw ApiError.internalServerError(`Error writing deployment file: ${error.message}`);
        }

        // Generate variables file
        await this.generateVariablesFile(deployment.type as DeploymentType);
    }

    async generateTfVarsFile(
        providerConfig: ProviderConfiguration,
        deploymentConfig: DeploymentConfiguration,
        deploymentType: DeploymentType
    ): Promise<void> {
        const tfVarsFilePath = path.join(this.workingDir, deploymentType, 'terraform.tfvars.json');

        // Helper function to format variables correctly
        const formatTfVarEntry = (key: string, config: DeploymentConfiguration[keyof DeploymentConfiguration]): any => {
            switch (config.type) {
                case InputTypes.Map:
                    if (!config.value) {
                        return {};
                    }
                    else {
                        return Object.fromEntries(Object.entries(config.value).map(([k, v]) => [k, v])); // Keep as a JSON object
                    }
                default:
                    return config.value;
            }
        };
        // Process provider configuration
        const providerVars: Record<string, any> = Object.fromEntries(
            Object.entries(providerConfig)
                .filter(([, config]) => !config.secret && !config.configuration) // Skip secrets
                .map(([key, config]) => [key, formatTfVarEntry(key, config as any)])
        );

        // Process deployment configuration
        const deploymentVars: Record<string, any> = Object.fromEntries(
            Object.entries(deploymentConfig)
                .filter(([, config]) => !config.secret && config.type !== InputTypes.Providers && config.type !== InputTypes.Resource) // Skip secrets
                .map(([key, config]) => [key, formatTfVarEntry(key, config)])
        );

        // Merge both configurations
        const tfVarsContent = {
            ...providerVars,
            ...deploymentVars
        };

        // Write to `terraform.tfvars.json` file
        try {
            await fs.promises.writeFile(tfVarsFilePath, JSON.stringify(tfVarsContent, null, 2), 'utf-8');
            console.log(`✅ terraform.tfvars.json generated at ${tfVarsFilePath}`);
        } catch (error: any) {
            console.error(`❌ Failed to write terraform.tfvars.json: ${error.message}`);
            throw ApiError.internalServerError('Failed to write terraform.tfvars.json');
        }
    }
}

export default TerraformManagementService;