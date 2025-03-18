import { withAPIHandler, withAuth } from '@/lib/middleware/apiWithMiddleware';
import { getSessionFromContext } from '@/lib/utils';
import { getSearchParams } from '@/lib/api_utils';
import { readProjects } from './function';

export const dynamic = 'force-dynamic';

export const GET = withAPIHandler(withAuth(async (req,context) => {
    const session = getSessionFromContext(context);
    const searchParams = getSearchParams(req);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : undefined;
    const projects = await readProjects(session.user.id, limit || undefined);
    return Response.json(projects);
}));