import { ProviderManagement } from '@/lib/core/project/ProviderManagement';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import { getUserFromContext } from '@/lib/utils';
import { ApiError } from '@/types/api/apiError';

export const GET = withAPIHandler(
    withAuthAndAdmin(
        async (_, context) => {
            const user = getUserFromContext(context);
            const providers = await ProviderManagement.readProvider(user.id);
            return Response.json(providers);
        }
    )
);

export const POST = withAPIHandler(withAuthAndAdmin(async (req,context) => {
    const { name, description, config, terraformProviderId } = await req.json();

    // Validate input
    if (!name || !config || !terraformProviderId) {
        throw ApiError.badRequest('Name and config and terraformProviderId are required');
    }

    const user = getUserFromContext(context);

    const newProvider = await ProviderManagement.createProvider(user.id, {
        terraformProviderId,
        name,
        description,
        config,
    });

    return Response.json(newProvider, { status: 201 });
}));