import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, getUserFromContext, mapResourceForRBAC } from '@/lib/utils';
import { providerConfigurationChangeSchema, validateWithSchema } from '@/types/schemas/zod';
import { InputTypes, ProviderConfiguration, ProviderConfigurationChange } from '@/types/PlatformStructure';

export const GET = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (_, context) => {
                const user = getUserFromContext(context);
                const provider = await prisma.provider.findUnique({
                    where: { name: providerName as string },
                    include: {
                        ACLs: {
                            where: {
                                userId: user.id,
                            },
                            select: {
                                Role: {
                                    select: {
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                });

                if (!provider) {
                    throw ApiError.notFound('Provider not found');
                }

                const sendProvider = {
                    id: provider?.id,
                    name: provider?.name,
                    description: provider?.description,
                    config: provider?.config,
                    role: provider?.ACLs[0]?.Role.name
                }
                return Response.json(sendProvider);
            },
            [PermissionTypes.ProviderRead],
            mapResourceForRBAC(providerName, 'Provider')
        )
    )(request, context);
}

export const PUT = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(withAuthAndRBAC(async (req) => {
        const { newConfig, name, description } = await req.json();

        if (newConfig) {
            validateWithSchema(providerConfigurationChangeSchema, newConfig);

            const newProviderConfig = newConfig as ProviderConfigurationChange;

            const provider = await prisma.provider.findUnique({
                where: { name: providerName as string },
            });

            if (!provider || !provider?.config) {
                throw ApiError.notFound('Provider not found');
            }

            const providerConfig = provider.config as ProviderConfiguration;

            // Check if the new config has the same keys as the old config
            for (const key in newProviderConfig) {
                if (!providerConfig[key]) {
                    throw ApiError.badRequest(`Key ${key} is not in the existing configuration`);
                }

                const oldConfigItem = providerConfig[key];
                const newConfigItem = newProviderConfig[key];

                if (oldConfigItem.secret) {
                    // Skip updating secret values
                    continue;
                }

                // Validate by input type
                switch (oldConfigItem.type) {
                    case InputTypes.Boolean:
                        if (typeof newConfigItem.value !== InputTypes.Boolean) {
                            throw ApiError.badRequest(`Key ${key} must be a boolean`);
                        }
                        break;

                    case InputTypes.Number:
                        if (typeof newConfigItem.value !== InputTypes.Number || isNaN(newConfigItem.value)) {
                            throw ApiError.badRequest(`Key ${key} must be a valid number`);
                        }
                        break;

                    case InputTypes.List:
                        if (!Array.isArray(newConfigItem.value)) {
                            throw ApiError.badRequest(`Key ${key} must be an array`);
                        }
                        if (!newConfigItem.value.every(item => typeof item === InputTypes.String)) {
                            throw ApiError.badRequest(`Key ${key} must contain only string items`);
                        }
                        break;

                    case InputTypes.String:
                    default:
                        if (typeof newConfigItem.value !== InputTypes.String) {
                            throw ApiError.badRequest(`Key ${key} must be a string`);
                        }
                        break;
                }

                // Assign the new value
                providerConfig[key].value = newConfigItem.value;
            }

            const updatedProvider = await prisma.provider.update({
                where: { name: providerName as string },
                data: {
                    config: providerConfig,
                    ...(name && description && { name, description }),
                },
            });

            return Response.json(updatedProvider);
        }
        else if (name && description) {
            const updatedProvider = await prisma.provider.update({
                where: { name: providerName as string },
                data: {
                    name,
                    description,
                },
            });

            return Response.json(updatedProvider);
        }
        else {
            throw ApiError.badRequest('Invalid operations');
        }
    }, [PermissionTypes.ProviderEdit], mapResourceForRBAC(providerName, 'Provider')))(request, context);
}

export const DELETE = (request: Request, context: any) => {
    const providerName = getParam(context, 'providerName', true);
    return withAPIHandler(withAuthAndRBAC(async () => {
        const deletedProvider = await prisma.provider.delete({
            where: { name: providerName as string },
        });
        return Response.json(deletedProvider);
    }, [PermissionTypes.ProviderEdit], mapResourceForRBAC(providerName, 'Provider')))(request, context);
}