import path from 'path';
import { DeploymentConfiguration, DeploymentQueueType, DeploymentStatus, DeploymentTemplate, DeploymentType, InputTypes, PlatformPaths, PlatformStructure, ResourceConfiguration, ResourceQuotaUsageType, ResourceUsageConfiguration, TerraformOutput, UniqueConstraintConfiguration, UniqueConstraintScope } from '@/types/PlatformStructure';
import { Deployment, Resource, Secret, Template, UniqueConstraint, User } from '@prisma/client';
import { ProjectManagement } from './ProjectManagement';
import prisma, { checkResourceCircularDependency } from '@/lib/prisma';
import { ApiError } from '@/types/api/apiError';
import { JsonObject } from '@prisma/client/runtime/library';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import { deploymentConfigurationSchema, deploymentTemplateSchema, ResourceConfigurationSchema, validateWithSchema } from '@/types/schemas/zod';
import { SecurityManager } from '@/lib/security/SecurityManager';
import fs from 'fs';
import deploymentQueueManager from './DeploymentQueueManager';
import { ProviderManagement } from './ProviderManagement';
import { convertTerraformOutput } from '@/lib/utility/terraform/terraformGetState';

export interface CustomDeployment extends Deployment {
    template: {
        details: JsonObject;
        TemplateProviders: {
            providerId: string;
        }[];
    };
    valid?: boolean;
}

export interface DeleteDeploymentResponse {
    status: 'ok' | 'failed' | 'cascade';
    message: string;
    resourceDependency?: JsonObject[];
    newDeploymentId?: Deployment['id'];
}

type ConstraintValue = { key: string; value: any; scope: UniqueConstraintScope };

class DeploymentService {
    private workingDir: string;
    private projectUUID: string;

    constructor(projectUUID: string) {
        this.projectUUID = projectUUID;
        this.workingDir = path.join(PlatformPaths.PROJECTS, projectUUID, PlatformStructure.TerraformFolder);
    }

    async validateDeployment(config: DeploymentConfiguration, templateDetails: DeploymentTemplate, templateId: Template['id'], deploymentDestroy?: boolean) {
        //template validate
        await ProjectManagement.getProject(this.projectUUID).templateInstance.validateTemplate(templateId, config);
        validateWithSchema(deploymentTemplateSchema, templateDetails);
        validateWithSchema(deploymentConfigurationSchema, config);
        for (const [key, value] of Object.entries(config)) {
            if (config[key].type === InputTypes.Number && value.value === 0) {
                throw ApiError.badRequest(`Configuration value is not valid format`);
            }
        }

        //provider validate
        const tDetails = templateDetails;
        const deploymentProviderId = Object.values(config).find((value) => value.type === InputTypes.Providers)?.value as string | null | undefined;
        if (deploymentProviderId) {
            const deploymentProvider = await prisma.provider.findUnique({
                where: { uuid: deploymentProviderId },
                select: {
                    terraformProvider: {
                        select: {
                            type: true
                        }
                    },
                    ProjectProvider: {
                        select: {
                            project: {
                                select: {
                                    uuid: true
                                }
                            }
                        }
                    }
                }
            });
            if (!deploymentProvider) {
                throw ApiError.badRequest('Deployment Provider not found');
            }

            //check all project Provider is in this project
            if (deploymentProvider.ProjectProvider.filter(pp => pp.project.uuid === this.projectUUID).length <= 0) {
                throw ApiError.badRequest('Deployment Provider is not in this project');
            }

            //check resourceProvider is in this project
            if (deploymentProvider.ProjectProvider.filter(pp => pp.project.uuid === this.projectUUID).length <= 0) {
                throw ApiError.badRequest('Resource Provider is not in this project');
            }

            const templateDetailProviderType = tDetails.inputs.find(input => input.type === InputTypes.Providers)?.providerType;
            if (deploymentProvider.terraformProvider.type !== templateDetailProviderType) {
                throw ApiError.badRequest('Deployment Provider Type Mismatch');
            }
        }

        //validate provider
        if (deploymentProviderId) {
            await ProviderManagement.validateProvider(deploymentProviderId);
        }
        //resource Reference Validate
        const resourceReference = tDetails.inputs.filter(input => input.type === InputTypes.Resource);
        const resourceReferenceIds = [] as string[];
        for (const resource of resourceReference) {
            const resourceConfig = config[resource.name];
            if (!resourceConfig) {
                if (!resource.required) {
                    continue;
                }
                throw ApiError.badRequest('Resource Reference not found');
            }
            if (!resource.required && resourceConfig.value === "" || resourceConfig.value === null) {
                continue;
            }
            const resourcei = await prisma.resource.findUnique({
                where: { uuid: resourceConfig.value },
                select: {
                    deployment: {
                        select: {
                            projectId: true
                        }
                    }
                }
            });
            
            if (!resourcei) {
                throw ApiError.badRequest('Resource Reference not found');
            }
            if (resourcei.deployment.projectId !== this.projectUUID) {
                throw ApiError.badRequest('Resource is not in this project');
            }
            resourceReferenceIds.push(resourceConfig.value);
        }

        //create resource validate
        if (templateDetails.resources) {
            const resources = templateDetails.resources as unknown as ResourceConfiguration[];
            for (const resource of resources) {
                validateWithSchema(ResourceConfigurationSchema, resource);
            }
        }

        //resource quota validate
        if (templateDetails.resourceUsages && deploymentDestroy === false) {
            const usage = {} as ResourceQuotaUsageType;
            const resourceUsages = templateDetails.resourceUsages as ResourceUsageConfiguration[];
            for (const resourceUsage of resourceUsages) {
                for (const [key, value] of Object.entries(resourceUsage)) {
                    if (value.value !== null && value.value !== undefined) {
                        usage[key] = parseInt(value.value);
                    }
                    else {
                        if (!config[value.from]) {
                            throw ApiError.badRequest('Invalid resource usage configuration reference');
                        }
                        usage[key] = parseInt(config[value.from].value);
                    }
                }
            }
            await ProjectManagement.getProject(this.projectUUID).projectResourceQuotaManager.validateResourceQuota(usage);
        }

        return { providerId: deploymentProviderId, resourceReferenceIds };
    }

    async validateDeploymentResourceDependencies(deploymentId: Deployment['id']) {
        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
            select: {
                id: true,
                Resource: {
                    select: {
                        uuid: true
                    }
                }
            }
        });
        if (!deployment) {
            throw ApiError.notFound('Deployment not found');
        }
        let dependentFail = false;
        const dResource = [] as JsonObject[];
        for (const resource of deployment.Resource) {
            let dependentResources = await this.getDependentResources(resource.uuid);
            dependentResources = dependentResources.filter(dep => dep !== resource.uuid);
            if (dependentResources.length > 0) {
                const resources = await prisma.resource.findMany({
                    where: {
                        uuid: {
                            in: dependentResources
                        }
                    },
                    select: {
                        name: true
                    }
                });
                if (resources.length <= 0) {
                    throw ApiError.notFound('Resource not found');
                }
                for (const res of resources) {
                    dResource.push(res);
                }
                dependentFail = true;
            }
        }

        return { dependentFail, dResource };
    }

    async createDeploymentUniqueConstraints(config: DeploymentConfiguration, templateDetails: DeploymentTemplate) {
        //unique constraint
        const ucs = templateDetails.uniqueConstraints as UniqueConstraintConfiguration[];
        const uniqueConstraints = [] as UniqueConstraint['id'][];
        const constraintValues = [] as ConstraintValue[];
        if (ucs) {
            await prisma.$transaction(async (tx) => {
                for (const resource of ucs) {
                    for (const [key, value] of Object.entries(resource)) {
                        if (config[value.from]) {
                            if (value.scope && !Object.values(UniqueConstraintScope).includes(value.scope)) {
                                throw ApiError.badRequest('Invalid scope');
                            }
                            const scope = value.scope || UniqueConstraintScope.Global;
                            const valueC = config[value.from].value;
                            let configValue = null;
                            if (valueC) {
                                if (typeof valueC === 'string') {
                                    configValue = valueC;
                                }
                                else if (typeof valueC === 'number') {
                                    configValue = valueC.toString();
                                }
                                else {
                                    throw ApiError.badRequest('Invalid configuration');
                                }
                            }
                            else {
                                throw ApiError.badRequest('Invalid configuration');
                            }
                            const uc = await tx.uniqueConstraint.create({
                                data: {
                                    key,
                                    value: configValue,
                                    scope: scope === UniqueConstraintScope.Project ? UniqueConstraintScope.Project + "_" + this.projectUUID : (scope === UniqueConstraintScope.Resource && value.scopeFrom ? UniqueConstraintScope.Resource + "_" + config[value.scopeFrom].value : scope)
                                }
                            });
                            constraintValues.push({
                                key,
                                value: configValue,
                                scope: uc.scope as UniqueConstraintScope
                            });
                            uniqueConstraints.push(uc.id);
                        }
                        else if (value.value && typeof value.value === 'string') {
                            if (value.scope && !Object.values(UniqueConstraintScope).includes(value.scope)) {
                                throw ApiError.badRequest('Invalid scope');
                            }
                            const scope = value.scope || UniqueConstraintScope.Global;
                            const uc = await tx.uniqueConstraint.create({
                                data: {
                                    key,
                                    value: value.value,
                                    scope: scope === UniqueConstraintScope.Project ? UniqueConstraintScope.Project + "_" + this.projectUUID : (scope === UniqueConstraintScope.Resource && value.scopeFrom ? UniqueConstraintScope.Resource + "_" + config[value.scopeFrom].value : scope)
                                }
                            });
                            constraintValues.push({
                                key,
                                value: value.value,
                                scope: uc.scope as UniqueConstraintScope
                            });
                            uniqueConstraints.push(uc.id);
                        }
                        else {
                            throw ApiError.badRequest('Invalid configuration'); // This will trigger rollback
                        }
                    }
                }
            });
        }
        return { uniqueConstraints, constraintValues };
    }

    async undoDeleteDeployment(deploymentId: Deployment['id'], userId: User['id']): Promise<void> {
        await prisma.$transaction(async (prisma) => {
            // 1. Fetch the deployment to do your other checks (e.g. status, child deployment)
            const deployment = await prisma.deployment.findUnique({
                where: { id: deploymentId, projectId: this.projectUUID },
            });
            if (!deployment) {
                throw ApiError.notFound('Deployment not found');
            }

            // 2. Validate user
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            // 3. Check status, child deployment, etc.
            if (deployment.status === DeploymentStatus.Running || deployment.status === DeploymentStatus.Queued) {
                throw ApiError.badRequest('Cannot undo running deployment');
            }
            if (deployment.parentDeploymentId) {
                throw ApiError.badRequest('Cannot delete child deployment');
            }

            const result = await prisma.deployment.updateMany({
                where: {
                    id: deployment.id,
                    projectId: this.projectUUID,
                    active: true,
                    destroy: true,
                    // Optionally also ensure it's not Running/Queued here if you want the DB to enforce that
                    // status: { notIn: [DeploymentStatus.Running, DeploymentStatus.Queued] }
                },
                data: {
                    active: false,
                },
            });

            // If result.count === 0, that means the record was already updated by someone else
            // (or it didn't match the 'active: true && destroy: true' condition).
            if (result.count === 0) {
                throw ApiError.badRequest('Invalid operation or concurrency conflict');
            }

            // 4. Special case: If status === Pending || Failed
            //    (restore child deployments, remove constraints, delete the record entirely)
            if (deployment.status === DeploymentStatus.Pending || deployment.status === DeploymentStatus.Failed) {
                // Re-activate child deployments
                const childDeployments = await prisma.deployment.updateMany({
                    where: {
                        parentDeployment: {
                            id: deployment.id,
                        },
                        active: false,
                    },
                    data: {
                        active: true,
                    },
                });

                if (childDeployments.count === 0) {
                    throw ApiError.badRequest('State Inconsistency. No child deployments found');
                }

                // Remove unique constraints for this deployment
                await prisma.uniqueConstraint.deleteMany({
                    where: {
                        deploymentId: deployment.id,
                    },
                });

                // Delete the deployment
                await prisma.deployment.delete({
                    where: { id: deployment.id },
                });

                // End the transaction early for this scenario
                return;
            }

            throw ApiError.badRequest('Operation not permitted');

            // 6. Now that the deployment is inactivated, create the "undo" replacement
            //    with new unique constraints. Use upsert to avoid duplication race conditions.
            // const uniqueConstraints = (deployment.constraintValues || []).map((constraint: any) => ({
            //     key: constraint.key,
            //     value: constraint.value,
            //     scope: constraint.scope
            // }));

            // const uniqueConstraintsIds: UniqueConstraint['id'][] = [];

            // for (const constraint of uniqueConstraints) {
            //     // Use upsert with your composite unique identifier (e.g. (key, value)).
            //     // Adjust if you also have a "scope" or any other fields in your unique index.
            //     const uc = await prisma.uniqueConstraint.upsert({
            //         where: {
            //             // This must match a unique index in your Prisma schema
            //             key_value_scope: {
            //                 key: constraint.key,
            //                 value: constraint.value,
            //                 scope: constraint.scope
            //             },
            //         },
            //         update: {}, // If it already exists, do nothing
            //         create: {
            //             key: constraint.key,
            //             value: constraint.value,
            //         },
            //     });
            //     uniqueConstraintsIds.push(uc.id);
            // }

            // // 7. Finally, create the new deployment referencing the constraints
            // await prisma.deployment.create({
            //     data: {
            //         user: {
            //             connect: { id: userId },
            //         },
            //         config: deployment.config || {},
            //         logs: {},
            //         status: DeploymentStatus.Pending,
            //         template: {
            //             connect: { id: deployment.templateId },
            //         },
            //         project: {
            //             connect: { uuid: this.projectUUID },
            //         },
            //         constraints: {
            //             connect: uniqueConstraintsIds.map((id) => ({ id })),
            //         },
            //         constraintValues: uniqueConstraints,
            //         childDeployments: {
            //             connect: { id: deployment.id },
            //         },
            //         ...(deployment.providerId && {
            //             provider: {
            //                 connect: { uuid: deployment.providerId },
            //             },
            //         }),
            //         type: deployment.type,
            //         destroy: false,
            //         active: true,
            //     },
            // });
        });
    }

    async createDeleteDeployment(deployment: Deployment, userId: User['id'], plan: boolean = false): Promise<Deployment['id']> {
        const uniqueConstraints = deployment.constraintValues.map((constraint: any) => {
            return {
                key: constraint.key,
                value: constraint.value,
                scope: constraint.scope
            }
        });

        // create new deployment with same config but destroy
        const newDeployment = await prisma.deployment.create({
            data: {
                user: {
                    connect: { id: userId }
                },
                config: deployment.config || {},
                logs: {},
                status: plan ? DeploymentStatus.Waiting: DeploymentStatus.Pending,
                plan,
                template: {
                    connect: { id: deployment.templateId }
                },
                project: {
                    connect: { uuid: this.projectUUID }
                },
                childDeployments: {
                    connect: { id: deployment.id }
                },
                ...(deployment.providerId && {
                    provider: {
                        connect: { uuid: deployment.providerId }
                    }
                }),
                type: deployment.type,
                constraintValues: uniqueConstraints,
                destroy: true,
                active: true
            }
        });
        if (plan) {
            await ProjectManagement.getProject(this.projectUUID).deploymentInstance.startDeployment(newDeployment.id);
        }
        return newDeployment.id;
    }

    async deleteDeployment(deploymentId: Deployment['id'], userId: User['id'], force?: boolean): Promise<DeleteDeploymentResponse> {
        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId, projectId: this.projectUUID },
            include: {
                Resource: {
                    select: {
                        uuid: true
                    }
                }
            }
        });

        if (!deployment) {
            throw ApiError.notFound('Deployment not found');
        }

        if (!userId && !force) {
            throw ApiError.badRequest('User not found');
        }

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw ApiError.notFound('User not found');
            }
        }

        if (deployment.active === false) {
            throw ApiError.badRequest('Deployment already deleted');
        }

        if (deployment.status === DeploymentStatus.Running || deployment.status === DeploymentStatus.Queued || deployment.status === DeploymentStatus.Planning) {
            throw ApiError.badRequest('Can not delete running deployment');
        }

        if (deployment.parentDeploymentId) {
            throw ApiError.badRequest('Can not delete child deployment');
        }

        const result = await prisma.deployment.updateMany({
            where: {
                id: deployment.id,
                projectId: this.projectUUID,
                active: true,
                destroy: false
            },
            data: {
                active: false
            }
        });

        if (result.count === 0) {
            throw ApiError.badRequest('Invalid operation or concurrency conflict');
        }

        if (deployment.status === DeploymentStatus.Completed) {
            //validate resource dependency
            const dDeployment = [] as JsonObject[];
            const { dependentFail, dResource } = await this.validateDeploymentResourceDependencies(deployment.id);
            // const dependentDeployment = await prisma.deployment.findMany({
            //     where: {
            //         active: true,
            //         destroy: false,
            //         status: {
            //             in: [DeploymentStatus.Failed, DeploymentStatus.Pending]
            //         },
            //         projectId: this.projectUUID, //to be changes later
            //         OR: [
            //             {
            //                 provider: {
            //                     resourceId: {
            //                         in: deployment.Resource.map(resource => resource.uuid)
            //                     }
            //                 }
            //             },
            //             {
            //                 resourceDependentId: {
            //                     in: deployment.Resource.map(resource => resource.uuid)
            //                 }
            //             }
            //         ]
            //     },
            //     select: {
            //         id: true
            //     }
            // });
            // if (dependentDeployment.length > 0) {
            //     dependentDeployment.forEach(async (d) => {
            //         dDeployment.push({
            //             name: d.id
            //         });
            //     });
            // }
            //dependent deployment
            if (dependentFail && !force) {
                await prisma.deployment.updateMany({
                    where: {
                        id: deployment.id
                    },
                    data: {
                        active: true
                    }
                });
                const dResponse = [] as JsonObject[];
                dResource.forEach((res) => {
                    dResponse.push({
                        name: res.name,
                        type: 'resource'
                    });
                });
                dDeployment.forEach((dep) => {
                    dResponse.push({
                        name: dep.name,
                        type: 'deployment'
                    });
                });
                return {
                    status: 'failed',
                    message: 'Delete failed due to dependent resources',
                    resourceDependency: dResponse
                };
            }
            else if (dependentFail && force) {
                await prisma.deployment.updateMany({
                    where: {
                        id: deployment.id
                    },
                    data: {
                        active: true
                    }
                });
                await this.cascadeDestroyDeployment(deployment.id, userId);
                return {
                    status: 'ok',
                    message: 'Cascade delete started'
                }
            }

            const newDeploymentId = await this.createDeleteDeployment(deployment, userId, true);
            return {
                status: 'ok',
                message: 'Deployment Deleted successfully',
                newDeploymentId
            };
        }
        else {
            const childDeployments = await prisma.deployment.findMany({
                where: {
                    parentDeployment: {
                        id: deployment.id
                    },
                    active: false
                }
            });

            if (childDeployments.length > 0) {
                await prisma.deployment.updateMany({
                    where: {
                        parentDeployment: {
                            id: deployment.id
                        },
                        active: false
                    },
                    data: {
                        active: true
                    }
                });
            }

            await prisma.uniqueConstraint.deleteMany({
                where: {
                    deploymentId: deployment.id
                }
            });

            await prisma.deployment.delete({
                where: { id: deployment.id }
            });

            const deploymentFilePath = path.join(this.workingDir, deployment.type, deployment.id + '.tf');
            if (fs.existsSync(deploymentFilePath)) {
                try {
                    // Delete the file
                    fs.unlinkSync(deploymentFilePath);
                    console.log(`File ${deploymentFilePath} was deleted successfully.`);
                } catch (err) {
                    console.error(`Error deleting file ${deploymentFilePath}:`, err);
                }
            }

            ProjectManagement.getProject(this.projectUUID).terraformInstance.generateVariablesFile(deployment.type as DeploymentType);
        }
        return {
            status: 'ok',
            message: 'Deployment Deleted successfully'
        };
    }

    async createDeployment(config: JsonObject, templateId: Template['id'], userId: User['id'], name?: Deployment['name'], destroy?: Deployment['destroy']): Promise<Deployment['id']> {
        const template = await prisma.template.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            throw ApiError.notFound('Template not found');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw ApiError.notFound('User not found');
        }

        const templateDetails = parsePrismaJson(template.details) as unknown as DeploymentTemplate;

        const secretList = [] as Secret['id'][];

        const configurationEntries = await Promise.all(
            Object.entries(config).map(async ([key, value]) => {
                if (!templateDetails.inputs.find(input => input.name === key)) {
                    throw ApiError.badRequest(`Configuration is not valid format`);
                }

                const type = templateDetails.inputs.find(input => input.name === key)?.type;
                const secret = templateDetails.inputs.find(input => input.name === key)?.secret;
                const configuration = templateDetails.inputs.find(input => input.name === key)?.configuration;

                if (!type) {
                    throw ApiError.badRequest(`Invalid input field ${key}`);
                }

                //validate configuration exists and not configuration

                if (configuration) {
                    throw ApiError.badRequest(`Bad configurations`);
                }

                if (secret) {
                    const secretId = await SecurityManager.encryptData(value as string);
                    secretList.push(secretId);
                    return [key, { type, value: secretId, secret: true }];
                }

                switch (type) {
                    case InputTypes.Map:
                        if (!value) {
                            value = {}
                        }
                        break;
                }

                return [key, { type, value }];
            })
        );

        const configuration = Object.fromEntries(configurationEntries);

        const configurationJson = JSON.parse(JSON.stringify(configuration));

        // Validate the config against the template

        const { providerId, resourceReferenceIds } = await this.validateDeployment(configurationJson, parsePrismaJson(template.details) as unknown as DeploymentTemplate, template.id, destroy);
        await ProjectManagement.getProject(this.projectUUID).templateInstance.importTemplate(template.id);
        const { uniqueConstraints, constraintValues } = await this.createDeploymentUniqueConstraints(configurationJson, parsePrismaJson(template.details) as unknown as DeploymentTemplate);

        let deployment = null;

        try {
            deployment = await prisma.deployment.create({
                data: {
                    user: {
                        connect: { id: userId }
                    },
                    config: configurationJson,
                    logs: {},
                    status: DeploymentStatus.Waiting,
                    plan: true,
                    active: true,
                    template: {
                        connect: { id: templateId }
                    },
                    project: {
                        connect: { uuid: this.projectUUID }
                    },
                    constraints: {
                        connect: uniqueConstraints.map(id => ({ id }))
                    },
                    constraintValues: constraintValues,
                    Secret: {
                        connect: secretList.map(secretId => ({ id: secretId }))
                    },
                    ...(providerId && {
                        provider: {
                            connect: { uuid: providerId }
                        }
                    }),
                    type: template.type,
                    ...(name ? { name } : {}),
                    ...(destroy ? { destroy } : {}),
                    ...(resourceReferenceIds.length > 0 ? {
                        resourceDependents: {
                            connect: resourceReferenceIds.map(id => ({ uuid: id }))
                        }
                    } : {})
                },
                include: {
                    template: {
                        select: {
                            details: true,
                            TemplateProviders: {
                                select: {
                                    providerId: true
                                }
                            }
                        }
                    }
                }
            }) as CustomDeployment;

            await ProjectManagement.getProject(this.projectUUID).deploymentInstance.startDeployment(deployment.id);
        }
        catch (e: any) {
            console.error(e);
            //remove unique constraints
            await prisma.uniqueConstraint.deleteMany({
                where: {
                    id: {
                        in: uniqueConstraints
                    }
                }
            });
        }

        if (!deployment) {
            throw ApiError.badRequest('Deployment Creation Failed');
        }

        return deployment.id;

        // await ProjectManagement.getProject(this.projectUUID).terraformInstance.generateDeploymentFile(deployment);
    }

    async createResource(deploymentConfigurations: DeploymentConfiguration, resource: ResourceConfiguration, deploymentId: Deployment['id'], details: JsonObject): Promise<Resource['uuid'] | null> {
        //validate resource with schema
        validateWithSchema(ResourceConfigurationSchema, resource);
        //validate resource name connected to its properties
        if (!deploymentConfigurations[resource.name.from]) {
            throw ApiError.badRequest('Invalid referenced name configuration');
        }
        const uniqueConstraints = await prisma.uniqueConstraint.findMany({
            where: {
                deploymentId
            },
            select: {
                id: true,
            }
        });
        const deployment = await prisma.deployment.findUnique({
            where: {
                id: deploymentId
            },
            select: {
                template: {
                    select: {
                        type: true,
                        details: true
                    }
                },
                provider: {
                    select: {
                        resourceId: true
                    }
                },
                resourceDependents: {
                    select: {
                        uuid: true
                    }
                }
            }
        });
        if (!deployment) {
            throw ApiError.notFound('Deployment not found');
        }
        //check if deployment.template.type is in DeploymentType
        if (!Object.values(DeploymentType).includes(deployment.template.type as DeploymentType)) {
            throw ApiError.badRequest('Invalid deployment type');
        }

        const resourceDetails = await convertTerraformOutput(details as any as TerraformOutput);
        const createdResource = await prisma.$transaction(async (prisma) => {
            const createdResource = await prisma.resource.create({
                data: {
                    name: deploymentConfigurations[resource.name.from].value,
                    type: deployment.template.type,
                    details: resourceDetails[deploymentId] as any || {},
                    deployment: {
                        connect: { id: deploymentId }
                    },
                    constraints: {
                        connect: uniqueConstraints.map(uc => ({ id: uc.id }))
                    }
                }
            });

            //resourceDependency
            if (!!deployment.provider?.resourceId) {
                const dependentId = createdResource.uuid;
                const dependencyId = deployment.provider.resourceId;
                if (dependentId === dependencyId) {
                    throw ApiError.badRequest('A resource cannot depend on itself.');
                }
                const hasCycle = await checkResourceCircularDependency(dependentId, dependencyId);
                if (hasCycle) {
                    throw ApiError.badRequest('Circular dependency detected! This update cannot be applied.');
                }
                await prisma.resourceDependency.create({
                    data: {
                        dependent: {
                            connect: {
                                uuid: dependentId
                            }
                        },
                        dependency: {
                            connect: {
                                uuid: dependencyId
                            }
                        }
                    }
                });
            }
            if (!!deployment.resourceDependents && deployment.resourceDependents.length > 0) {
                const dependentId = createdResource.uuid;
                const dependencyIds = deployment.resourceDependents.map(dep => dep.uuid);
                if (dependencyIds.includes(dependentId)) {
                    throw ApiError.badRequest('A resource cannot depend on itself.');
                }
                for (const dependencyId of dependencyIds) {
                    const hasCycle = await checkResourceCircularDependency(dependentId, dependencyId);
                    if (hasCycle) {
                        throw ApiError.badRequest('Circular dependency detected! This update cannot be applied.');
                    }
                    await prisma.resourceDependency.create({
                        data: {
                            dependent: {
                                connect: {
                                    uuid: dependentId
                                }
                            },
                            dependency: {
                                connect: {
                                    uuid: dependencyId
                                }
                            }
                        }
                    });
                }
            }

            if (resource.provider) {
                const terraformProvider = await prisma.terraformProvider.findUnique({
                    where: {
                        id: resource.provider.providerId
                    }
                });
                if (!terraformProvider) {
                    throw ApiError.notFound('Provider configuration not found');
                }
                const providerConfiguration = Object.entries(resource.provider.config).reduce(
                    (acc, [key, value]) => {
                        acc[key] = value.from === 'id'
                            ? createdResource.uuid
                            : deploymentConfigurations[value.from].value;
                        return acc;
                    },
                    {} as Record<string, { value: string }>
                );

                const providerCreation = await ProviderManagement.createProvider(null, {
                    name: terraformProvider.name + '-' + createdResource.name,
                    description: terraformProvider.description + ' on ' + createdResource.name,
                    terraformProviderId: terraformProvider.id,
                    config: providerConfiguration,
                });

                await prisma.provider.update({
                    where: {
                        uuid: providerCreation.uuid
                    },
                    data: {
                        resource: {
                            connect: {
                                uuid: createdResource.uuid
                            }
                        }
                    }
                })

                await prisma.projectProvider.create({
                    data: {
                        project: {
                            connect: {
                                uuid: this.projectUUID
                            }
                        },
                        provider: {
                            connect: {
                                id: providerCreation.id
                            }
                        }
                    }
                });
            }

            //resource Usage
            const templateDetails = deployment.template.details as unknown as DeploymentTemplate;
            if (templateDetails && templateDetails.resourceUsages) {
                const resourceUsages = templateDetails.resourceUsages;
                for (const resourceUsage of resourceUsages) {
                    const usage = {} as ResourceQuotaUsageType;
                    for (const [key, value] of Object.entries(resourceUsage)) {
                        if (deploymentConfigurations[value.from] !== null && deploymentConfigurations[value.from] !== undefined) {
                            usage[key] = parseInt(deploymentConfigurations[value.from].value);
                        }
                    }
                    const rsQuota = await prisma.resourceQuotaUsage.upsert({
                        where: {
                            resourceId: createdResource.uuid,
                        },
                        update: {
                            usage
                        },
                        create: {
                            resourceId: createdResource.uuid,
                            usage
                        }
                    })
                    await ProjectManagement.getProject(this.projectUUID).projectResourceQuotaManager.updateProjectResourceUsage(rsQuota);
                }
            }
            return createdResource;
        });
        return createdResource.uuid;
    }

    async startDeployment(deploymentId: Deployment['id']): Promise<Deployment['id']> {
        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
            select: {
                id: true,
                status: true,
                active: true,
                config: true,
                plan: true,
                templateId: true,
                destroy: true,
                template: {
                    select: {
                        details: true
                    }
                }
            }
        });

        if (!deployment) {
            throw ApiError.notFound('Deployment not found');
        }

        if (!((deployment.status === DeploymentStatus.Pending||deployment.status === DeploymentStatus.Waiting) && !deployment.active)) {
            if (!(deployment.status === DeploymentStatus.Pending || deployment.status === DeploymentStatus.Waiting || deployment.status === DeploymentStatus.Failed) || !deployment.active) {
                throw ApiError.badRequest('Can not start deployed deployment');
            }
        }

        //validate deployment
        await this.validateDeployment(deployment.config as DeploymentConfiguration, parsePrismaJson(deployment.template.details) as unknown as DeploymentTemplate, deployment.templateId, deployment.destroy);

        await deploymentQueueManager.enqueue(this.projectUUID, deploymentId, deployment.plan ? DeploymentQueueType.Plan : DeploymentQueueType.Apply);

        return deploymentId;
    }

    async getDependentResources(resourceId: string): Promise<string[]> {
        // 1) Fetch all dependency relations once
        const allDependencies = await prisma.resourceDependency.findMany({
            select: { dependentId: true, dependencyId: true },
        });

        // 2) Build adjacency list: dependencyId => array of direct dependents
        const adjacencyList = new Map<string, string[]>();
        for (const { dependencyId, dependentId } of allDependencies) {
            if (!adjacencyList.has(dependencyId)) {
                adjacencyList.set(dependencyId, []);
            }
            adjacencyList.get(dependencyId)!.push(dependentId);
        }

        // 3) Prepare for DFS
        const visited = new Set<string>();
        const result: string[] = [];

        // Use a recursive DFS to get post-order
        function dfs(current: string) {
            visited.add(current);

            // Get all direct dependents (children)
            const dependents = adjacencyList.get(current) || [];
            for (const dep of dependents) {
                if (!visited.has(dep)) {
                    dfs(dep);
                }
            }

            // Post-order position: once we finish all children, add `current`
            result.push(current);
        }

        // 4) Run DFS starting from the given `resourceId`
        dfs(resourceId);

        // 5) Return the resulting list
        // NOTE: This list **includes** the original `resourceId` at the end.
        //       If you only want the dependents *excluding* `resourceId` itself,
        //       remove it: `return result.slice(0, -1);`
        return result;
    }

    async cascadeDestroyDeployment(deploymentId: Deployment['id'], userId: User['id']): Promise<void> {
        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
            include: {
                Resource: {
                    select: {
                        uuid: true
                    }
                },
                parentDeployment: {
                    select: {
                        id: true,
                        status: true,
                        destroy: true
                    }
                }
            }
        });

        if (!deployment) {
            throw ApiError.notFound('Deployment not found');
        }

        if (!(deployment.active && !deployment.destroy && deployment.status === DeploymentStatus.Completed)) {
            throw ApiError.badRequest('Invalid Deployment Operations');
        }

        interface DeploymentWithProvider extends Deployment {
            parentDeployment: {
                id: string;
                status: string;
                destroy: boolean;
            } | null;
        }

        const cascadeDestroyDeployments = {
            infrastructure: [] as DeploymentWithProvider[],
            infrastructureConfiguration: [] as DeploymentWithProvider[],
            application: [] as DeploymentWithProvider[],
            applicationConfiguration: [] as DeploymentWithProvider[],
        }

        for (const resource of deployment.Resource) {
            const dependentResources = await this.getDependentResources(resource.uuid);
            if (dependentResources.length > 0) {
                const resources = await prisma.resource.findMany({
                    where: {
                        uuid: {
                            in: dependentResources
                        }
                    },
                    select: {
                        uuid: true,
                        type: true,
                        deployment: {
                            include: {
                                parentDeployment: {
                                    select: {
                                        id: true,
                                        status: true,
                                        destroy: true
                                    }
                                }
                            }
                        }
                    }
                });
                // 🔥 Sort resources to match the order in `dependentResources`
                resources.sort((a, b) => {
                    return dependentResources.indexOf(a.uuid) - dependentResources.indexOf(b.uuid);
                });
                if (resources.length <= 0) {
                    throw ApiError.notFound('Resource not found');
                }
                for (let i = 0; i < resources.length; i++) {
                    const res = resources[i];
                    if (!res.deployment || res.deployment.destroy || res.deployment.status !== DeploymentStatus.Completed) {
                        throw ApiError.badRequest('Invalid Deployment Operations');
                    }
                    switch (res.type) {
                        case DeploymentType.Infrastructure:
                            cascadeDestroyDeployments.infrastructure.push(res.deployment);
                            break;
                        case DeploymentType.InfrastructureConfiguration:
                            cascadeDestroyDeployments.infrastructureConfiguration.push(res.deployment);
                            break;
                        case DeploymentType.Application:
                            cascadeDestroyDeployments.application.push(res.deployment);
                            break;
                        case DeploymentType.ApplicationConfiguration:
                            cascadeDestroyDeployments.applicationConfiguration.push(res.deployment);
                            break;
                    }
                }
            }
        }

        // switch (deployment.type) {
        //     case DeploymentType.Infrastructure:
        //         cascadeDestroyDeployments.infrastructure.push(deployment);
        //         break;
        //     case DeploymentType.InfrastructureConfiguration:
        //         cascadeDestroyDeployments.infrastructureConfiguration.push(deployment);
        //         break;
        //     case DeploymentType.Application:
        //         cascadeDestroyDeployments.application.push(deployment);
        //         break;
        //     case DeploymentType.ApplicationConfiguration:
        //         cascadeDestroyDeployments.applicationConfiguration.push(deployment);
        //         break;
        // }

        const deploymentKeys: (keyof typeof cascadeDestroyDeployments)[] = [
            'applicationConfiguration',
            'application',
            'infrastructureConfiguration',
            'infrastructure'
        ];

        for (const key of deploymentKeys) {
            if (cascadeDestroyDeployments[key].length > 0) {
                for (let i = 0; i < cascadeDestroyDeployments[key].length; i++) {
                    const deployment = cascadeDestroyDeployments[key][i];
                    if (deployment.active) {
                        const result = await prisma.deployment.updateMany({
                            where: {
                                id: deployment.id,
                                active: true,
                                destroy: false
                            },
                            data: {
                                active: false
                            }
                        });

                        if (result.count === 0) {
                            throw ApiError.badRequest('Invalid operation or concurrency conflict');
                        }

                        const did = await this.createDeleteDeployment(deployment, userId);

                        // Ensure the returned id is a string
                        if (typeof did !== 'string') {
                            throw ApiError.badRequest('Cascade destroy failed');
                        }

                        await this.startDeployment(did);
                    }
                    else if (deployment.parentDeployment && !deployment.active && (deployment.parentDeployment.status === DeploymentStatus.Pending || deployment.parentDeployment.status === DeploymentStatus.Failed) && deployment.parentDeployment.destroy) {
                        await this.startDeployment(deployment.parentDeployment.id);
                    }
                    else {
                        throw ApiError.badRequest('Invalid Deployment Operations');
                    }
                }
            }
        }
    }
}

export default DeploymentService;