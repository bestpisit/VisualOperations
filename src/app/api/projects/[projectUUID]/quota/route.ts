import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
import { withAPIHandler, withAuthAndAdmin } from '@/lib/middleware/apiWithMiddleware';
import prisma from '@/lib/prisma';
import { getParam } from '@/lib/utils';
import { ApiError } from '@/types/api/apiError';
import { ProjectResourceQuotaType } from '@/types/PlatformStructure';
import { ProjectResourceQuotaTypeSchema, validateWithSchema } from '@/types/schemas/zod';

export const PATCH = withAPIHandler(withAuthAndAdmin(async (req, context) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    const body = await req.json();

    if (!body.quotas || typeof body.quotas !== 'object') {
        return Response.json({ error: 'Invalid or missing quotas data' }, { status: 400 });
    }

    const { projectUsage } = await ProjectManagement.getProject(projectUUID).projectResourceQuotaManager.getProjectQuota();
    const newQuotas = body.quotas as ProjectResourceQuotaType;
    validateWithSchema(ProjectResourceQuotaTypeSchema, newQuotas);

    // Validate new quotas (must not be less than current usage)
    for (const key of Object.keys(projectUsage)) {
        if (newQuotas[key] && newQuotas[key] < projectUsage[key]) {
            throw ApiError.badRequest(`New quota for ${key} is less than current usage`);
        }
    }

    // Update quota
    const updatedQuota = await prisma.projectResourceQuota.update({
        where: { projectId: projectUUID },
        data: { quotas: newQuotas },
    });

    return Response.json({ message: 'Resource quota updated successfully', data: updatedQuota });
}));