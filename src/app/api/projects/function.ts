import prisma from "@/lib/prisma";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import { Project } from "@prisma/client";
import { User } from "next-auth";

export async function readProjects(userId: User['id'], limit?: number): Promise<Project[]>{
    // Read all workspaces
    const projects = await prisma.aCL.findMany({
        where: {
            userId: userId,
            Role: {
                RolePermissions: {
                    some: {
                        permission: {
                            name: PermissionTypes.ProjectRead
                        }
                    }
                }
            }
        },
        distinct: ['projectId'],
        select:{
            Project: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    uuid: true
                }
            }
        },
        ...(limit ? {take: limit} : {}),
        orderBy: {
            updatedAt: 'desc'
        }
    });
    return projects.map(p => p.Project).filter(p => p !== null) as Project[];
}