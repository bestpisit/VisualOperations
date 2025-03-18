export const dynamic = 'force-dynamic';

import { withAPIHandler, withAuthAndSuperAdmin } from '@/lib/middleware/apiWithMiddleware';
import { ENCRYPTION_KEY } from '@/lib/security/SecurityManager';
import { ApiError } from '@/types/api/apiError';
import { rotateSecrets } from './function';

export const POST = withAPIHandler(withAuthAndSuperAdmin(async (req) => {
    try {
        const { newKey, oldKey } = await req.json();
        if (!newKey || !oldKey) {
            throw ApiError.badRequest('Missing required fields.');
        }
        if(oldKey !== ENCRYPTION_KEY) {
            throw ApiError.badRequest('Old key does not match.');
        }
        await rotateSecrets(newKey, oldKey);
        return Response.json({ message: 'Rotate Secret Successfully' });
    } catch (e: any) {
        console.error('Unexpected error:', e);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}));