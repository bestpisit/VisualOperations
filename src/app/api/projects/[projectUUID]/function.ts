import prisma from '@/lib/prisma';
import { ApiError } from '@/types/api/apiError';
import { RoleTypes } from '@/types/prisma/RBACTypes';
import { Project, User } from '@prisma/client';

export interface CustomProject extends Project {
    role: {
        name: string;
    }
}

export default async function getProject(uuid: Project['name'], userID: User['id']): Promise<CustomProject | null> {
    const project = await prisma.project.findUnique({
        where: {
            uuid
        }
    });

    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    const userRole = await prisma.aCL.findFirst({
        where: {
            userId: userID,
            projectId: project.id
        },
        select: {
            Role: {
                select: {
                    name: true
                }
            }
        }
    });

    const user = await prisma.user.findFirst({
        where: {
            id: userID
        },
        select: {
            role: {
                select: {
                    name: true
                }
            }
        }
    });

    if (!userRole) {
        if (user?.role?.name === RoleTypes.SuperAdmin || user?.role?.name === RoleTypes.Admin) {
            const projectResponse = project as CustomProject;
            projectResponse.role = {
                name: RoleTypes.ProjectOwner
            };
            return projectResponse;
        }
        throw ApiError.forbidden('User does not have access to this project');
    }
    else if (user?.role?.name === RoleTypes.SuperAdmin || user?.role?.name === RoleTypes.Admin) {
        const projectResponse = project as CustomProject;
        projectResponse.role = {
            name: RoleTypes.ProjectOwner
        };
        return projectResponse
    }

    const projectResponse = project as CustomProject;
    projectResponse.role = userRole.Role;

    return projectResponse;
}