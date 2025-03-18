import React from 'react';
import { withAuthAndRBACServer } from '@/lib/middleware/serverWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { notFound, redirect } from 'next/navigation';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import prisma from '@/lib/prisma';
import { DeploymentTemplate, InputTypes } from '@/types/PlatformStructure';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/route';
import { readProjects } from '@/app/api/projects/function';
import TemplatePage from '../TemplatePage';
import { mapResourceForRBAC } from '@/lib/utils';

export default async function TemplateServerPage({
    params,
}: {
    params: { templateId: string; projectId: string; };
}) {
    await withAuthAndRBACServer([PermissionTypes.ProjectResourceCreate], mapResourceForRBAC(params.projectId, 'Project'));

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

    if (!projects) {
        return notFound();
    }

    const project = projects.find((project) => project.uuid === params.projectId);

    if (!project) {
        return notFound();
    }

    const templateJson = parsePrismaJson<DeploymentTemplate>(template?.details as string);

    templateJson.inputs = templateJson.inputs.filter(inputt => !inputt.configuration)

    if (!templateJson) {
        return notFound();
    }

    const providers = await prisma.provider.findMany({
        where: {
            ...(
                templateJson.inputs.some((input) => input.type === InputTypes.Providers) && {
                    terraformProvider: {
                        type: templateJson.inputs.find((input) => input.type === InputTypes.Providers)?.providerType
                    }
                }),
            ProjectProvider: {
                some: {
                    projectId: project.id
                }
            }
        },
    });

    if (!project) {
        return notFound();
    }

    return (
        <TemplatePage
            projects={projects}
            projectId={params.projectId}
            templateData={templateJson}
            providerss={providers}
        />
    );
}