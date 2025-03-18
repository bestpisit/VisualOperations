import { withAuthAndRBACServer } from '@/lib/middleware/serverWithMiddleware';
import { notFound, redirect } from 'next/navigation';
import TemplatePage from './TemplatePage';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import prisma from '@/lib/prisma';
import { DeploymentTemplate } from '@/types/PlatformStructure';
import { readProjects } from '@/app/api/projects/function';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/route';
import { PermissionTypes } from '@/types/prisma/RBACTypes';

export default async function TemplateServerPage({
    params,
}: {
    params: { templateId: string };
}) {
    await withAuthAndRBACServer([PermissionTypes.TemplateRead]);

    const templateId = params.templateId;

    const template = await prisma.template.findUnique({
        where: { id: templateId },
    });

    if (!template) {
        return notFound();
    }

    const session = await auth();

    if (!session) {
        return redirect(ROUTES.LOGIN);
    }

    const projects = await readProjects(session.user.id);

    const templateJson = parsePrismaJson<DeploymentTemplate>(template?.details as string);

    if (!templateJson) {
        return notFound();
    }

    return (
        <TemplatePage
            templateData={templateJson}
            projects={projects}
        />
    );
}