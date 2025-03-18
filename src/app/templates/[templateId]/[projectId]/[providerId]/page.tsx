import React from 'react';
import { withAuthAndRBACServer } from '@/lib/middleware/serverWithMiddleware';
import { PermissionTypes } from '@/types/prisma/RBACTypes';
import { notFound, redirect } from 'next/navigation';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import prisma from '@/lib/prisma';
import { DeploymentTemplate, UniqueConstraintConfiguration } from '@/types/PlatformStructure';
import TemplatePage from '../../TemplatePage';
import { auth } from '@/auth';
import { ROUTES } from '@/lib/route';
import { readProjects } from '@/app/api/projects/function';
import { cidrToRegex } from '@/lib/utility/cidr/cidrToRegex';
import { mapResourceForRBAC } from '@/lib/utils';
import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
import { generateRangeRegex } from '@/lib/utility/regex';

export default async function TemplateServerPage({
    params,
}: {
    params: { templateId: string; projectId: string; providerId: string };
}) {
    await withAuthAndRBACServer([PermissionTypes.ProjectResourceCreate], mapResourceForRBAC(params.projectId, 'Project'));

    const templateId = params.templateId;

    const template = await prisma.template.findUnique({
        where: { id: templateId },
    });

    if (!template) {
        return notFound();
    }

    const provider = await prisma.provider.findUnique({
        where: { uuid: params.providerId },
    });

    if (!provider) {
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

    const providers = await prisma.provider.findMany({
        where: {
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

    //format the template details

    const templateJson = parsePrismaJson<DeploymentTemplate>(template?.details as string);

    const templateInputReferences = templateJson.inputs.filter((input) => input.validation?.from && input.validation?.reference);

    for (const input of templateInputReferences) {
        const reference = input.validation.reference;

        const provider = providers.find((provider) => provider.uuid === params.providerId);
        const providerReference = provider ? (provider.config as any)[reference as keyof typeof provider.config] : undefined;

        templateJson.inputs = templateJson.inputs.filter(inputt => !inputt.configuration).map((inputt) => {
            if (inputt.name === input.name) {
                if (inputt.type === 'regex') {
                    inputt.validation = {
                        regex: cidrToRegex(providerReference.value),
                        error_message: `IP must follow CIDR ${providerReference.value}`
                    }
                }
                else if (inputt.type === 'list') {
                    inputt.validation = {
                        list: providerReference.value,
                        error_message: `Value must be one of ${providerReference.value.join(', ')}`
                    }
                }
            }

            return inputt;
        });
    }

    //resourceQuota
    if (templateJson.resourceUsages) {
        const {projectQuota, projectUsage} = await ProjectManagement.getProject(params.projectId).projectResourceQuotaManager.getProjectQuota();
        for (const resourceUsage of templateJson.resourceUsages) {
            for (const [key, value] of Object.entries(resourceUsage)) {
                if (value.from) {
                    const inputField = templateJson.inputs.find((input) => input.name === value.from);
                    if (!inputField) {
                        continue;
                    }
                    const newValidation = {
                        ...inputField?.validation,
                        regex: generateRangeRegex(0, projectQuota[key] - projectUsage[key]),
                        max: projectQuota[key] - projectUsage[key],
                        current: projectUsage[key],
                        error_message: projectQuota[key] - projectUsage[key] <= 0 ? `Resource Quota ${inputField.title} exceeded` : `${inputField.title} must be between 1 and ${projectQuota[key] - projectUsage[key]}`
                    };
                    inputField.validation = newValidation;
                    inputField.quota = true;
                }
            }
        }
    }

    if (!templateJson) {
        return notFound();
    }

    const uc = templateJson.uniqueConstraints as UniqueConstraintConfiguration[];

    if (uc) {
        for (const resource of uc) {
            for (const [key, value] of Object.entries(resource)) {
                if (value.from) {
                    const inputField = templateJson.inputs.find((input) => input.name === value.from);
                    if (!inputField) {
                        continue;
                    }
                    inputField.constraint = key;
                }
            }
        }
    }

    return (
        <TemplatePage
            projects={projects}
            projectId={params.projectId}
            providerId={params.providerId}
            templateData={templateJson}
            providerss={providers}
        />
    );
}