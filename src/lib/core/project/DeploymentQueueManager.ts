import prisma from '@/lib/prisma';
import { ApiError } from '@/types/api/apiError';
import { DeploymentConfiguration, DeploymentQueue, DeploymentQueueType, DeploymentStatus, DeploymentTemplate, DeploymentType, ProviderConfiguration, ProviderTemplate, TerraformOutput } from '@/types/PlatformStructure';
import TerraformExecuterService from './TerraformExecuterService';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import { ProjectManagement } from './ProjectManagement';
import { CustomDeployment } from './DeploymentService';
import { SecretConnection, SecurityManager } from '@/lib/security/SecurityManager';
import { Deployment, Project } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';
import amqplib, { ConsumeMessage } from 'amqplib';
import { connect, ChannelWrapper, AmqpConnectionManager } from 'amqp-connection-manager';
import { convertTerraformOutput } from '@/lib/utility/terraform/terraformGetState';
import { generateVisualizationData } from '@/lib/utility/visualization/VisualizationUtility';

const rabbitmqConnectionString = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672';

class DeploymentQueueManager {
    private static instance: DeploymentQueueManager;
    private amqpConnection!: AmqpConnectionManager;
    private channelWrapper!: ChannelWrapper;
    private workers: Map<string, boolean>; // Tracks active workers by projectUUID

    private constructor() {
        console.log('DeploymentQueueManager constructor called');
        this.workers = new Map();
        this.initializeRabbitMQ();
    }

    private initializeRabbitMQ(): void {
        // Create a connection manager
        this.amqpConnection = connect([rabbitmqConnectionString], {
            // Optional, e.g. heartbeatIntervalInSeconds: 10,
            reconnectTimeInSeconds: 5,
        });

        // Log connection status
        this.amqpConnection.on('connect', () => {
            console.log('RabbitMQ connected via amqp-connection-manager.');
        });

        this.amqpConnection.on('disconnect', (params) => {
            console.error('RabbitMQ disconnected!', params.err?.message);
            // The library will automatically retry connecting
        });

        // Create a channel wrapper
        this.channelWrapper = this.amqpConnection.createChannel({
            json: false, // We are sending raw Buffers, so leave this false
            setup: async (channel: amqplib.ConfirmChannel) => {
                // This function is called every time the channel re-connects
                console.log('Channel setup called, setting prefetch to 1.');
                await channel.prefetch(1);
            },
        });
    }

    public static getInstance(): DeploymentQueueManager {
        if (!DeploymentQueueManager.instance) {
            DeploymentQueueManager.instance = new DeploymentQueueManager();
        }
        return DeploymentQueueManager.instance;
    }

    // Add a deployment to the queue for a specific projectUUID
    public async enqueue(projectUUID: string, deploymentId: string | null, deploymentQueueType: DeploymentQueueType): Promise<void> {
        const queueName = `deploymentQueue:${projectUUID}`;
        let deploymentQueue = {
            type: deploymentQueueType,
            deploymentId,
            projectId: projectUUID,
            timestamp: new Date(),
        } as DeploymentQueue;
        // Attempt DB update
        if (deploymentQueueType === DeploymentQueueType.Apply || deploymentQueueType === DeploymentQueueType.Plan) {
            if (deploymentId === null) {
                throw ApiError.badRequest('Deployment ID missing in request');
            }
            let startedDeployment: Deployment | null = null;
            startedDeployment = await prisma.deployment.findUnique({
                where: {
                    id: deploymentId
                }
            });
            if (!startedDeployment) {
                throw ApiError.notFound('Deployment not found');
            }

            // let expectedDeploymentStatus: DeploymentStatus | null = null;
            // let nextDeploymentStatus: DeploymentStatus | null = null;
            if (!(startedDeployment.status === DeploymentStatus.Failed || startedDeployment.status === DeploymentStatus.Pending || startedDeployment.status === DeploymentStatus.Waiting)) {
                throw ApiError.badRequest('Deployment not queued, found: ' + startedDeployment.status);
            }
            // switch (deploymentQueueType) {
            //     case DeploymentQueueType.Apply:
            //         if (startedDeployment.status !== DeploymentStatus.Pending && startedDeployment.status !== DeploymentStatus.Failed) {
            //             throw ApiError.badRequest('Deployment not planned');
            //         }
            //         expectedDeploymentStatus = DeploymentStatus.Pending;
            //         nextDeploymentStatus = DeploymentStatus.Queued;
            //         break;
            //     case DeploymentQueueType.Plan:
            //         if (startedDeployment.status !== DeploymentStatus.Waiting) {
            //             throw ApiError.badRequest('Deployment not waiting');
            //         }
            //         expectedDeploymentStatus = DeploymentStatus.Waiting;
            //         nextDeploymentStatus = DeploymentStatus.Queued;
            //         break;
            //     default:
            //         throw ApiError.badRequest('Invalid deployment queue type');
            // }

            try {
                startedDeployment = await prisma.deployment.update({
                    where: {
                        id: deploymentId
                    },
                    data: {
                        status: DeploymentStatus.Queued,
                        logs: {},
                    },
                });
            } catch (err) {
                console.error('Failed to update deployment in DB:', err);
                throw ApiError.internalServerError('Failed to enqueue deployment (DB update).');
            }

            if (!startedDeployment) {
                throw ApiError.notFound('Deployment not found or can`t deploy.');
            }
        }
        else if (deploymentQueueType === DeploymentQueueType.Refresh) {
            deploymentQueue = {
                type: deploymentQueueType,
                projectId: projectUUID,
                timestamp: new Date(),
            } as DeploymentQueue;
        }

        // 1) Assert the queue (with single-active-consumer)
        await this.channelWrapper.addSetup(async (channel: amqplib.Channel) => {
            await channel.assertQueue(queueName, {
                durable: true,
                arguments: {
                    'x-single-active-consumer': true,
                },
            });
        });

        // 2) Send the message
        try {
            this.channelWrapper.sendToQueue(
                queueName,
                Buffer.from(JSON.stringify(deploymentQueue)),
                { persistent: true },
            );
            console.log(`Enqueued deployment ID: ${deploymentQueue.deploymentId} to queue: ${queueName}`);
        } catch (err) {
            console.error('Failed to send message to queue:', err);
            // Mark deployment as failed in DB
            if (deploymentQueueType === DeploymentQueueType.Apply || deploymentQueueType === DeploymentQueueType.Plan) {
                if (deploymentId === null) {
                    throw ApiError.badRequest('Deployment ID missing in request');
                }
                await prisma.deployment.update({
                    where: { id: deploymentId },
                    data: {
                        status: DeploymentStatus.Failed,
                        logs: {},
                    },
                });
            }
            throw ApiError.internalServerError('Failed to enqueue deployment (sendToQueue).');
        }

        // 3) Start worker if not already started
        if (!this.workers.has(projectUUID)) {
            console.log(`Starting worker for project ${projectUUID}`);
            await this.startWorker(projectUUID);
        }
    }

    // Start a worker for a specific projectUUID
    private async startWorker(projectUUID: string): Promise<void> {
        // Prevent duplicate local worker for the same project
        if (this.workers.has(projectUUID)) {
            console.log(`Worker for project ${projectUUID} is already running on this instance.`);
            return;
        }
        this.workers.set(projectUUID, true);

        const queueName = `deploymentQueue:${projectUUID}`;

        // Setup the consumer. We do it inside addSetup so it re-subscribes after reconnection.
        await this.channelWrapper.addSetup(async (channel: amqplib.Channel) => {
            console.log(`(Re)Subscribing to queue: ${queueName} for project: ${projectUUID}`);

            await channel.assertQueue(queueName, {
                durable: true,
                arguments: { 'x-single-active-consumer': true },
            });

            // The consumer callback
            const onMessage = async (msg: ConsumeMessage | null) => {
                if (!msg) return; // Consumer was cancelled
                const deploymentQueue = JSON.parse(msg.content.toString()) as DeploymentQueue;
                console.log(`Queuing deployment ID: ${deploymentQueue.deploymentId} for project ${projectUUID}`);

                try {
                    switch (deploymentQueue.type) {
                        case DeploymentQueueType.Apply:
                            if (!deploymentQueue.deploymentId) {
                                throw ApiError.badRequest('Deployment ID missing in queue message');
                            }
                            await this.processDeployment(projectUUID, deploymentQueue.deploymentId, DeploymentQueueType.Apply);
                            break;
                        case DeploymentQueueType.Plan:
                            if (!deploymentQueue.deploymentId) {
                                throw ApiError.badRequest('Deployment ID missing in queue message');
                            }
                            await this.processDeployment(projectUUID, deploymentQueue.deploymentId, DeploymentQueueType.Plan);
                            break;
                        case DeploymentQueueType.Refresh:
                            if (!deploymentQueue.projectId) {
                                throw ApiError.badRequest('Project ID missing in queue message');
                            }
                            await this.processRefreshProject(deploymentQueue.projectId);
                            break;
                        default:
                            console.error('Unknown deployment queue type:', deploymentQueue.type);
                    }

                    // Acknowledge success
                    channel.ack(msg);
                } catch (err) {
                    console.error(`Error processing deployment ID: ${deploymentQueue.deploymentId}`, err);
                    // Requeue the message
                    channel.nack(msg, false, true);
                }
            };

            // Start consuming
            await channel.consume(queueName, onMessage, { noAck: false });
        });

        console.log(`Worker for project ${projectUUID} started (consumer subscribed).`);
    }

    private async processRefreshProject(projectUUID: string): Promise<void> {
        console.log(`Processing terraform refresh for project ${projectUUID}`);
        const projectResources = await prisma.resource.findMany({
            where: {
                deployment: {
                    projectId: projectUUID
                }
            },
            select: {
                deployment: {
                    select: {
                        type: true
                    }
                }
            }
        });
        const deploymentOrder = [
            DeploymentType.Infrastructure,
            DeploymentType.InfrastructureConfiguration,
            DeploymentType.Application,
            DeploymentType.ApplicationConfiguration
        ];
        const deploymentTypes = projectResources.map((resource) => resource.deployment.type).reduce((acc: DeploymentType[], type) => {
            if (!acc.includes(type as DeploymentType)) {
                acc.push(type as DeploymentType);
            }
            return acc;
        }, [] as DeploymentType[]).sort((a, b) => deploymentOrder.indexOf(a as DeploymentType) - deploymentOrder.indexOf(b as DeploymentType));
        if (deploymentTypes.length === 0) {
            return;
        }
        const outputs: { [key: string]: any } = {};
        const templateIdsList: string[] = [];
        for (const deploymentType of deploymentTypes) {
            const { combinedSecretVars, projectDeployments, providerConfig, deploymentsConfig } = await this.getProjectAllVariables(projectUUID, deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateProviderFile(deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.deleteAllDeploymentFiles(deploymentType);

            for (const deployment of projectDeployments) {
                if (deployment.active === false && deployment.destroy === false && deployment.status === DeploymentStatus.Completed) {
                    const parentDeployment = projectDeployments.find((d) => deployment.parentDeploymentId === d.id)
                    if (parentDeployment && parentDeployment.active === true && parentDeployment.destroy === true && !(parentDeployment.status === DeploymentStatus.Completed || parentDeployment.status === DeploymentStatus.Running || parentDeployment.status === DeploymentStatus.Planning)) {
                        deployment.valid = true;
                    }
                }
                if (!templateIdsList.includes(deployment.templateId)) {
                    await ProjectManagement.getProject(projectUUID).templateInstance.importTemplate(deployment.templateId);
                    templateIdsList.push(deployment.templateId);
                }
                await ProjectManagement.getProject(projectUUID).terraformInstance.generateDeploymentFile(deployment as CustomDeployment);
            }

            await ProjectManagement.getProject(projectUUID).terraformInstance.generateVariablesFile(deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateTfVarsFile(providerConfig, deploymentsConfig, deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateOutputFile(deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateDataFile(deploymentType);
            const { output: refreshOutput } = await new TerraformExecuterService(projectUUID, undefined, deploymentType).refreshDeployment(combinedSecretVars);
            Object.keys(refreshOutput).forEach((key) => {
                outputs[key] = refreshOutput[key];
            });
        }

        const deploymentOutputs = await convertTerraformOutput(outputs);

        if (!deploymentOutputs) {
            return;
        }

        Object.keys(deploymentOutputs).forEach(async (key) => {
            const resource = await prisma.resource.findFirst({
                where: {
                    deploymentId: key
                }
            });
            if (resource) {
                await prisma.resource.update({
                    where: {
                        uuid: resource.uuid
                    },
                    data: {
                        details: deploymentOutputs[key] as any
                    }
                });
            }
        });

        await prisma.project.update({
            where: {
                uuid: projectUUID
            },
            data: {
                isRefreshing: false
            }
        });
    }

    // Process a single deployment
    private async processDeployment(projectUUID: string, deploymentId: string, deploymentQueueType: DeploymentQueueType): Promise<void> {
        console.log(`Processing deployment ${deploymentId} for project ${projectUUID}`);
        let deploymentStatus = null;

        try {
            const deployment = await prisma.deployment.findUnique({
                where: { id: deploymentId },
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

            deploymentStatus = deployment.status;

            switch (deploymentQueueType) {
                case DeploymentQueueType.Apply:
                    if (deployment.status !== DeploymentStatus.Queued) {
                        throw ApiError.badRequest('Deployment not queued, found: ' + deployment.status);
                    }
                    break;
                case DeploymentQueueType.Plan:
                    if (deployment.status !== DeploymentStatus.Queued) {
                        throw ApiError.badRequest('Deployment not planning, found: ' + deployment.status);
                    }
                    break;
                default:
                    throw ApiError.badRequest('Invalid deployment queue type');
            }


            //deployment has resource dependency
            for (const resource of deployment.Resource) {
                const resourceDepends = await prisma.resource.findUnique({
                    where: {
                        uuid: resource.uuid
                    },
                    select: {
                        _count: {
                            select: {
                                dependents: true
                            }
                        }
                    }
                });
                if (!resourceDepends) {
                    throw ApiError.badRequest('Resource Not Found');
                }
                if (resourceDepends._count.dependents > 0) {
                    throw ApiError.badRequest('Deployment has resource dependency');
                }
            }

            const newStatus =
                deploymentQueueType === DeploymentQueueType.Apply
                    ? DeploymentStatus.Running
                    : DeploymentStatus.Planning;

            const startedDeployment = await prisma.deployment.update({
                where: { id: deploymentId },
                data: {
                    status: newStatus,
                    logs: {}
                },
                include: {
                    template: {
                        select: {
                            details: true
                        }
                    },
                    childDeployments: {
                        select: {
                            id: true
                        }
                    }
                }
            });

            if (deployment.destroy && deployment.active) {
                const childDeployments = await prisma.deployment.findMany({
                    where: {
                        parentDeployment: {
                            id: startedDeployment.id
                        },
                        active: true
                    }
                });

                if (childDeployments.length > 0) {
                    await prisma.deployment.updateMany({
                        where: {
                            parentDeployment: {
                                id: deployment.id
                            },
                            active: true
                        },
                        data: {
                            active: false
                        }
                    });
                }
            }

            //Validate again before applying
            const projectDeploymentInstance = ProjectManagement.getProject(projectUUID).deploymentInstance;
            await projectDeploymentInstance.validateDeployment(startedDeployment.config as DeploymentConfiguration, parsePrismaJson(startedDeployment.template.details) as unknown as DeploymentTemplate, startedDeployment.templateId, startedDeployment.destroy);
            let { dependentFail } = await projectDeploymentInstance.validateDeploymentResourceDependencies(startedDeployment.id);
            if (startedDeployment.destroy && startedDeployment.active) {
                const childDeployments = await prisma.deployment.findMany({
                    where: {
                        parentDeployment: {
                            id: startedDeployment.id
                        },
                        active: false,
                        destroy: false
                    }
                });
                if (childDeployments.length <= 0) {
                    throw ApiError.badRequest('Deployment State Invalid');
                }
                else {
                    for (const childDeployment of childDeployments) {
                        const { dependentFail: dF } = await projectDeploymentInstance.validateDeploymentResourceDependencies(childDeployment.id);
                        if (dF) {
                            dependentFail = true;
                        }
                        break;
                    }
                }
            }
            if (dependentFail) {
                throw ApiError.badRequest('Resource Dependency Validation Failed');
            }

            // Execute your old deployment logic
            await this.executeDeploymentLogic(projectUUID, deploymentId, startedDeployment, startedDeployment.type as DeploymentType);

        } catch (error) {
            const existingDeployment = await prisma.deployment.findUnique({
                where: { id: deploymentId },
            });
            if (existingDeployment && !(deploymentStatus === DeploymentStatus.Completed || deploymentStatus === DeploymentStatus.Running || deploymentStatus === DeploymentStatus.Planning)) {
                // Handle errors and mark the deployment as failed
                await prisma.deployment.update({
                    where: { id: deploymentId },
                    data: {
                        status: DeploymentStatus.Failed
                    }
                });
            }
            console.error(`Error processing deployment ${deploymentId}:`, error);
        }
    }

    // Integrate your old deployment executor logic here
    private async executeDeploymentLogic(projectUUID: string, deploymentId: string, startedDeployment: Deployment, deploymentType: DeploymentType): Promise<void> {
        const combinedSecretVars = [] as any[];
        let terraformApplied = false;
        let appliedCompleted = false;

        const ideployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
            include: { template: { select: { details: true } }, childDeployments: { select: { id: true } } }
        });

        if (!ideployment) {
            throw ApiError.internalServerError('Deployment not found');
        }
        try {
            const { combinedSecretVars, providerConfig, deploymentsConfig, projectDeployments } = await this.getProjectAllVariables(projectUUID, deploymentType);

            await ProjectManagement.getProject(projectUUID).terraformInstance.generateProviderFile(deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.deleteAllDeploymentFiles(deploymentType);

            for (const deployment of projectDeployments) {
                if (deployment.active === false && deployment.destroy === false && deployment.status === DeploymentStatus.Completed) {
                    const parentDeployment = projectDeployments.find((d) => deployment.parentDeploymentId === d.id)
                    if (parentDeployment && parentDeployment.active === true && parentDeployment.destroy === true && !(parentDeployment.status === DeploymentStatus.Completed || parentDeployment.status === DeploymentStatus.Running || parentDeployment.status === DeploymentStatus.Planning)) {
                        deployment.valid = true;
                    }
                }
                // if (deployment.status === DeploymentStatus.Planning && deployment.active === true && deployment.destroy === true) {
                //     continue;
                // }
                await ProjectManagement.getProject(projectUUID).terraformInstance.generateDeploymentFile(deployment as CustomDeployment);
            }
            // if (startedDeployment.plan && startedDeployment.status === DeploymentStatus.Planning) {
            //     const sDeployment = await prisma.deployment.findUnique({
            //         where: { id: deploymentId },
            //         include: {
            //             template: {
            //                 select: {
            //                     details: true,
            //                     TemplateProviders: {
            //                         select: {
            //                             providerId: true
            //                         }
            //                     }
            //                 }
            //             }
            //         }
            //     });
            //     if (!sDeployment) {
            //         throw ApiError.notFound('Deployment not found');
            //     }
            //     await ProjectManagement.getProject(projectUUID).terraformInstance.generateDeploymentFile(sDeployment as CustomDeployment);
            // }

            await ProjectManagement.getProject(projectUUID).templateInstance.importTemplate(startedDeployment.templateId);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateVariablesFile(deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateTfVarsFile(providerConfig, deploymentsConfig, deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateOutputFile(deploymentType);
            await ProjectManagement.getProject(projectUUID).terraformInstance.generateDataFile(deploymentType);

            await new TerraformExecuterService(projectUUID, deploymentId, deploymentType).terraformInit(!startedDeployment.plan);
            await new TerraformExecuterService(projectUUID, deploymentId, deploymentType).terraformValidate(true);
            terraformApplied = true;
            let output = null;
            switch (startedDeployment.status) {
                case DeploymentStatus.Running:
                    const { output: applyOutput } = await new TerraformExecuterService(projectUUID, deploymentId, deploymentType).startDeployment(combinedSecretVars, true);
                    output = applyOutput;
                    break;
                case DeploymentStatus.Planning:
                    const { output: planOutput } = await new TerraformExecuterService(projectUUID, deploymentId, deploymentType, true).planDeployment(combinedSecretVars, true);
                    output = planOutput;
                    break;
                default:
                    throw ApiError.badRequest('Deployment State Invalid');
            }
            appliedCompleted = true;

            //create resource
            if (startedDeployment.status === DeploymentStatus.Running) {
                if (ideployment.destroy) {
                    //check resource has a provider and remove
                    await prisma.resource.deleteMany({
                        where: {
                            deploymentId:
                                { in: ideployment.childDeployments.map((childDeployment) => childDeployment.id) }
                        }
                    });
                    await ProjectManagement.getProject(projectUUID).projectResourceQuotaManager.updateProjectResourceUsage();
                }
                else {
                    const templateDetails = parsePrismaJson(ideployment.template.details) as unknown as DeploymentTemplate;
                    if (templateDetails.resources) {
                        for (const resource of templateDetails.resources) {
                            const resourceOutput = Object.keys(output).filter((key) => key.startsWith(ideployment.id))?.reduce((acc, key) => {
                                acc[key] = output[key];
                                return acc;
                            }, {} as TerraformOutput);
                            await ProjectManagement.getProject(ideployment.projectId).deploymentInstance.createResource(ideployment.config as DeploymentConfiguration, resource, ideployment.id, resourceOutput as unknown as JsonObject);
                        }
                    }
                }

                const postDeploymentState = await generateVisualizationData(projectUUID);

                await prisma.deployment.update({
                    where: { id: deploymentId },
                    data: {
                        status: DeploymentStatus.Completed,
                        postDeploymentState: postDeploymentState as any
                    }
                });
            }
            else if (startedDeployment.status === DeploymentStatus.Planning) {
                const preDeploymentState = await generateVisualizationData(projectUUID);
                await prisma.deployment.update({
                    where: { id: deploymentId },
                    data: {
                        status: DeploymentStatus.Pending,
                        plan: false,
                        preDeploymentState: preDeploymentState as any,
                        // planOutput: output as any
                    }
                });
            }
            else {
                throw ApiError.badRequest('Deployment State Invalid');
            }
        }
        catch (e) {
            //Failed Deployment
            await prisma.deployment.update({
                where: { id: deploymentId },
                data: {
                    status: DeploymentStatus.Failed
                }
            });

            if (terraformApplied && startedDeployment.status === DeploymentStatus.Running) {
                if (appliedCompleted) {
                    if (ideployment.destroy === false) {
                        //create resource failed
                        await prisma.resource.deleteMany({
                            where: {
                                deploymentId: deploymentId
                            }
                        });
                        await ProjectManagement.getProject(projectUUID).projectResourceQuotaManager.updateProjectResourceUsage();
                        await ProjectManagement.getProject(projectUUID).terraformInstance.deleteDeploymentFile(startedDeployment.id);
                        await ProjectManagement.getProject(projectUUID).terraformInstance.generateOutputFile(deploymentType);
                        try {
                            await new TerraformExecuterService(projectUUID, deploymentId, deploymentType).startDeployment(combinedSecretVars, false);
                        }
                        catch {
                            //assume there is no error
                        }
                    }
                }
                else {
                    if (!ideployment.destroy) {
                        //check resource has a provider and remove
                        await prisma.resource.deleteMany({
                            where: {
                                deploymentId: deploymentId
                            }
                        });
                        await ProjectManagement.getProject(projectUUID).projectResourceQuotaManager.updateProjectResourceUsage();
                        await ProjectManagement.getProject(projectUUID).terraformInstance.deleteDeploymentFile(startedDeployment.id);
                        await ProjectManagement.getProject(projectUUID).terraformInstance.generateOutputFile(deploymentType);
                    }
                    try {
                        await new TerraformExecuterService(projectUUID, deploymentId, deploymentType).startDeployment(combinedSecretVars, false);
                    }
                    catch {
                        //assume there is no error
                    }
                }
            }
            else if (startedDeployment.status === DeploymentStatus.Planning) {
                if (startedDeployment.destroy === false) {
                    await ProjectManagement.getProject(projectUUID).deploymentInstance.deleteDeployment(startedDeployment.id, startedDeployment.userId || "", true);
                }
            }

            console.error(`Error processing deployment ${deploymentId} Failed:`, e);
            console.log(e);

            // throw ApiError.internalServerError('Deployment Failed');
        }
    }

    // Stop the worker for a specific projectUUID
    public stopWorker(projectUUID: string): void {
        this.workers.set(projectUUID, false);
    }

    private async getProjectAllVariables(projectUUID: Project['uuid'], deploymentType: DeploymentType) {
        const combinedSecretVars = [] as any[];
        const deployment = await prisma.deployment.findMany({
            where: {
                projectId: projectUUID,
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
                ProjectProvider: {
                    some: {
                        project: {
                            uuid: projectUUID
                        }
                    }
                },
                uuid: {
                    in: deploymentsProvider
                }
            },
            include: {
                terraformProvider: {
                    select: {
                        details: true
                    }
                }
            }
        });

        const providerConfig: ProviderConfiguration = projectProviders.reduce((acc, provider) => {
            const configs = parsePrismaJson(provider.config) as ProviderConfiguration;

            const terraformProviderDetails = parsePrismaJson(provider.terraformProvider.details) as unknown as ProviderTemplate;
            if (terraformProviderDetails.resourceProvider) {
                return acc;
            }

            Object.keys(configs).forEach((key) => {
                acc[`${provider.uuid}_${key}`] = {
                    type: configs[key].type,
                    value: configs[key].value,
                    secret: configs[key].secret,
                    configuration: configs[key].configuration,
                    providerId: provider.uuid
                };
            });

            return acc;
        }, {} as ProviderConfiguration);

        const projectDeployments = await prisma.deployment.findMany({
            where: {
                projectId: projectUUID,
                type: deploymentType,
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
        }) as CustomDeployment[];

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
                    deployment.status === DeploymentStatus.Running || deployment.status === DeploymentStatus.Planning);

            return isUsualNotDelete;
        });

        const deploymentsConfig: DeploymentConfiguration = deployments.reduce((acc, deployment) => {
            const configs = parsePrismaJson(deployment.config) as DeploymentConfiguration;
            const templateJson = parsePrismaJson(deployment.template.details) as unknown as DeploymentTemplate;

            for (const input of templateJson.inputs) {
                if (input.dummy) continue;
                if (input.configuration && input.required) {
                    if (!input.validation?.from || !input.validation?.reference) {
                        throw ApiError.badRequest('Invalid configuration template')
                    }
                    if (!configs[input.validation?.from].value) {
                        throw ApiError.badRequest('Configuration invalid')
                    }
                    if (input.validation?.import) {
                        continue;
                    }
                    const provider = projectProviders.find((provider) => provider.uuid === configs[input.validation?.from].value);
                    const providerReference = provider ? (provider.config as any)[input.validation.reference as keyof typeof provider.config] : undefined;

                    if (!provider || !providerReference) {
                        throw ApiError.notFound('Provider Not Found');
                    }

                    acc[`${deployment.id}_${input.name}`] = {
                        type: input.type,
                        value: providerReference.value,
                        secret: input.secret,
                        deploymentId: deployment.id
                    };
                }
                else if (input.configuration && !input.required) {
                    if (!input.validation?.from || !input.validation?.reference) {
                        throw ApiError.badRequest('Invalid configuration template')
                    }
                    if (configs[input.validation?.from].value) {
                        if (input.validation?.import) {
                            continue;
                        }
                        const provider = projectProviders.find((provider) => provider.uuid === configs[input.validation?.from].value);
                        const providerReference = provider ? (provider.config as any)[input.validation.reference as keyof typeof provider.config] : undefined;

                        if (!provider || !providerReference) {
                            throw ApiError.notFound('Provider Not Found');
                        }

                        acc[`${deployment.id}_${input.name}`] = {
                            type: input.type,
                            value: providerReference.value,
                            secret: input.secret,
                            deploymentId: deployment.id
                        };
                    }
                }
                else {
                    const config = configs[input.name];

                    if (!config) {
                        throw ApiError.badRequest(`Missing configuration for ${input.name}`);
                    }

                    acc[`${deployment.id}_${input.name}`] = {
                        type: configs[input.name].type,
                        value: configs[input.name].value,
                        secret: configs[input.name].secret,
                        deploymentId: deployment.id
                    };
                }
            }

            return acc;
        }, {} as DeploymentConfiguration);

        const formatTfVarEntry = (key: string, value: any) => {
            return {
                key: key,
                value: value,
            };
        };

        // Decrypt secret value
        const decryptSecretValue = async (value: any, secretConnection: SecretConnection): Promise<any> => await SecurityManager.decryptData(value, secretConnection);

        // Process provider configuration
        const processProviderVars = async () => {
            const providerVarPromises = Object.entries(providerConfig)
                .filter(([, config]) => config.secret) // Include only secrets
                .map(async ([key, config]) => formatTfVarEntry(key, await decryptSecretValue(config.value, { providerId: config.providerId })));

            return (await Promise.all(providerVarPromises));
        };

        // Process deployment configuration
        const processDeploymentVars = async () => {
            const deploymentVarPromises = Object.entries(deploymentsConfig)
                .filter(([, config]) => config.secret) // Include only secrets
                .map(async ([key, config]) => formatTfVarEntry(key, await decryptSecretValue(config.value, { deploymentId: config.deploymentId })));

            return (await Promise.all(deploymentVarPromises));
        };

        // Combine both variables
        try {
            const [providerVars, deploymentVars] = await Promise.all([
                processProviderVars(),
                processDeploymentVars()
            ]);

            providerVars.forEach((providerVar) => combinedSecretVars.push(providerVar));
            deploymentVars.forEach((deploymentVar) => combinedSecretVars.push(deploymentVar));
        } catch (error) {
            console.error("Error while decrypting variables:", error);
            throw error; // Propagate error if needed
        }

        return { combinedSecretVars, providerConfig, deploymentsConfig, projectDeployments };
    }
}

const deploymentQueueManager = DeploymentQueueManager.getInstance();
export default deploymentQueueManager;