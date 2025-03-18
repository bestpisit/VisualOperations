import prisma from "@/lib/prisma";
import { SecurityManager } from "@/lib/security/SecurityManager";
import { parsePrismaJson } from "@/lib/utility/prismaUtility";
import { ApiError } from "@/types/api/apiError";
import { InputField, InputTypes, ProviderConfiguration, ProviderTemplate } from "@/types/PlatformStructure";
import { PermissionTypes, RoleTypes } from "@/types/prisma/RBACTypes";
import { inputFieldSchema, providerTemplateSchema, StringNumberBooleanSchema, validateWithSchema } from "@/types/schemas/zod";
import { Provider, Secret } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { User } from "next-auth";
import { z } from "zod";

export class ProviderManagement {
    static async createProvider(userId: User['id'] | null, data: { name: string, description?: string, terraformProviderId: Provider['terraformProviderId'], config?: any}): Promise<Provider> {
        const config = data.config as JsonObject;
        if (!data.config) {
            throw ApiError.badRequest('Config is required');
        }

        //Validate Config
        if (typeof config !== 'object') {
            throw ApiError.badRequest('Config must be an object');
        }

        //Config all must have key and value of string number boolean
        for (const key in config) {
            validateWithSchema(StringNumberBooleanSchema, config[key]);
        }

        try {
            // Start a transaction
            const result = await prisma.$transaction(async (prisma) => {
                // Step 0: Check if the terraformProviderId exists
                const terraformProvider = await prisma.terraformProvider.findUnique({
                    where: { id: data.terraformProviderId },
                });
                if (!terraformProvider) {
                    throw ApiError.badRequest('Terraform Provider not found');
                }

                const terraformProviderDetails = parsePrismaJson(terraformProvider.details) as unknown as ProviderTemplate;

                // Validate the config against the template
                validateWithSchema(providerTemplateSchema, terraformProviderDetails);

                const secretList = [] as Secret['id'][];

                const configurationEntries = await Promise.all(
                    Object.entries(config).map(async ([key, value]) => {
                        const type = terraformProviderDetails.inputs.find(input => input.name === key)?.type;
                        const secret = terraformProviderDetails.inputs.find(input => input.name === key)?.secret;
                        const configuration = terraformProviderDetails.inputs.find(input => input.name === key)?.configuration;

                        if (!type) {
                            throw ApiError.badRequest(`Invalid input field ${key}`);
                        }

                        if (configuration) {
                            return [key, { type, value, configuration: true }];
                        }

                        if (secret) {
                            const secretId = await SecurityManager.encryptData(value as string);
                            secretList.push(secretId);
                            return [key, { type, value: secretId, secret: true }];
                        } else {
                            return [key, { type, value }];
                        }
                    })
                );

                const configuration: Record<string, { type: string; value: unknown; secret?: boolean }> = Object.fromEntries(configurationEntries);

                // Step 1: Create the provider
                const newProvider = await prisma.provider.create({
                    data: {
                        terraformProvider: {
                            connect: {
                                id: data.terraformProviderId,
                            },
                        },
                        name: data.name,
                        description: data.description || null,
                        config: JSON.parse(JSON.stringify(configuration)),
                        Secret: {
                            connect: secretList.map(secretId => ({ id: secretId }))
                        }
                    },
                });

                // Step 2: Find the role ID for 'OWNER'
                const ownerRole = await prisma.role.findUnique({
                    where: { name: RoleTypes.ProviderOwner }, // Adjust this query as per your Role model
                });

                if (!ownerRole) {
                    throw ApiError.internalServerError(`Role ${RoleTypes.ProviderOwner} not found`);
                }

                // Step 3: Create an ACL entry for the user with the roleId
                if (userId !== null) {
                    await prisma.aCL.create({
                        data: {
                            userId: userId,
                            providerId: newProvider.id,
                            roleId: ownerRole.id, // Use roleId here instead of directly connecting role
                        },
                    });
                }

                // Return the newly created project
                return newProvider;
            });

            return result; // Transaction succeeded
        } catch (error: any) {
            // Handle Prisma P2002 (Unique Constraint Violation)
            if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
                throw ApiError.badRequest('A provider with this name already exists. Please choose a different name.');
            }

            // Log other errors
            console.error("Error creating provider with transaction:", error);
            throw ApiError.internalServerError('Failed to create provider');
        }
    }

    static async readProvider(userId: User['id']): Promise<Provider[]> {
        // Read all workspaces
        const providers = await prisma.aCL.findMany({
            where: {
                userId: userId,
                Role: {
                    RolePermissions: {
                        some: {
                            permission: {
                                name: PermissionTypes.ProviderRead
                            }
                        }
                    }
                }
            },
            distinct: ['providerId'],
            select: {
                Provider: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });
        return providers.map(p => p.Provider).filter(p => p !== null) as Provider[];
    }

    static async validateProvider(providerId: Provider['uuid']): Promise<void> {
        const provider = await prisma.provider.findUnique({
            where: { uuid: providerId }
        });
        if (!provider) {
            throw ApiError.notFound('Provider Error: Provider not found');
        }
        const terraformProvider = await prisma.terraformProvider.findUnique(
            {
                where: {
                    id: provider.terraformProviderId
                }
            }
        );
        if (!terraformProvider) {
            throw new Error(`Provider Error: Terraform provider with id ${provider.terraformProviderId} not found`);
        }
        const terraformDetails = parsePrismaJson(terraformProvider.details) as unknown as ProviderTemplate;

        validateWithSchema(providerTemplateSchema, terraformDetails);

        if (!terraformDetails) {
            throw ApiError.internalServerError('Provider Error: Terraform provider details not found');
        }

        // Safely extract inputs and filter to ensure correct typing
        const inputs = terraformDetails.inputs as InputField[];
        const providerConfig = parsePrismaJson(provider.config) as ProviderConfiguration;

        validateWithSchema(z.array(inputFieldSchema), inputs);

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
                            }
                        }
                    });
                    if (!resource) {
                        throw ApiError.badRequest(`Resource Provider not found`);
                    }
                }
            }
        }
    }
}