export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { withAuthAndAdmin, withAPIHandler } from '@/lib/middleware/apiWithMiddleware';
import { getSearchParams } from '@/lib/api_utils';

// Type for the response
interface LogResponse {
    logs: any[];
    nextCursor: string | null;
}

// API Route Handler
export const GET = withAPIHandler(withAuthAndAdmin(async (req) => {
    const searchParams = getSearchParams(req);
    const cursorTimestamp = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 20);

    // Fetch logs with cursor logic
    const logs = await prisma.accessLog.findMany({
        take: limit,
        where: cursorTimestamp
            ? { timestamp: { lt: new Date(cursorTimestamp) } }
            : {},
        orderBy: [
            { timestamp: 'desc' },
            { id: 'desc' },  // Break ties for logs with the same timestamp
        ],
    });

    // Determine the next cursor (last item's timestamp)
    const nextCursor = logs.length ? logs[logs.length - 1].timestamp : null;

    const response: LogResponse = {
        logs,
        nextCursor: nextCursor ? nextCursor.toISOString() : null,
    };

    return Response.json(response);
}));