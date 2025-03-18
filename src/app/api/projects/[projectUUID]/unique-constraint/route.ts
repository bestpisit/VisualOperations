import prisma from '@/lib/prisma';
import { withAPIHandler, withAuthAndRBAC } from '@/lib/middleware/apiWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { ApiError } from '@/types/api/apiError';
import { getParam, mapResourceForRBAC } from '@/lib/utils';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import { DeploymentTemplate, UniqueConstraintScope } from '@/types/PlatformStructure';
export const POST = (request: Request, context: any) => {
    const projectUUID = getParam(context, 'projectUUID', true);
    return withAPIHandler(
        withAuthAndRBAC(
            async (req) => {
                const {key,value,templateId} = await req.json();

                if (!key || !value || !templateId) {
                    throw ApiError.badRequest('Key and value and templateId are required');
                }

                const template = await prisma.template.findFirst({
                    where: {
                        id: templateId
                    }
                });

                if (!template) {
                    throw ApiError.badRequest('Template not found');
                }

                const templateDetails = parsePrismaJson(template.details) as unknown as DeploymentTemplate;

                if (!templateDetails.uniqueConstraints) {
                    throw ApiError.badRequest('Template does not have unique constraints');
                }

                const uc = templateDetails.uniqueConstraints.find((constraint) => !!constraint[key]);

                if (!uc) {
                    throw ApiError.badRequest('Unique constraint not found in template');
                }

                const uniqueConstraint = await prisma.uniqueConstraint.findFirst({
                    where: {
                        key,
                        value,
                        scope: uc[key].scope || UniqueConstraintScope.Global
                    }
                });

                if (uniqueConstraint) {
                    throw ApiError.badRequest('Unique constraint already exists');
                }

                return Response.json({
                    key,
                    value
                },{status: 200});
            },
            [PermissionTypes.ProjectResourceCreate],
            mapResourceForRBAC(projectUUID, 'Project', true)
        )
    )(request, context);
}