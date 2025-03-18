export const dynamic = 'force-dynamic';
import { auth } from "@/auth";
import { withAPIHandler, withAuth } from "@/lib/middleware/apiWithMiddleware";

async function getProtectedData() {
    const session = await auth();
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json(session.user);
}

export const GET = withAPIHandler(withAuth(getProtectedData));