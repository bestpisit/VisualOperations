import React from "react";
import ProjectLayoutComponent from "./ProjectLayoutComponent";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/route";
import getProject, { CustomProject } from "@/app/api/projects/[projectUUID]/function";
import { auth } from "@/auth";
import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = {
    params: {
        uuid: string;
    };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const project = await prisma.project.findUnique({
        where: {
            uuid: params.uuid,
        },
        select: {
            name: true,
            description: true,
        },
    });

    if (!project) {
        return {
            title: 'Project Not Found',
            description: 'Project not found',
        }
    }

    return {
        title: `${project.name}`,
        description: project.description,
    };
}

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { uuid: string };  // Access uuid from dynamic route
}) {
    await withAuthAndRBACServer([PermissionTypes.ProjectRead], { 'Project': { 'uuid' : String(params.uuid) } });
    const { uuid } = params;   // Extract uuid from params
    const session = await auth();

    if (!session || !session.user) {
        redirect(ROUTES.LOGIN);
    }
    let project = null as CustomProject | null;
    try {
        project = await getProject(uuid, session?.user.id);  // Fetch project data
    }
    catch {
        redirect(ROUTES.PROJECTS);
    }

    if (!project) {
        redirect(ROUTES.UNAUTHORIZED);
    }

    return (
        <div className="flex-grow flex relative w-full h-full">
            <ProjectLayoutComponent project={project}>{children}</ProjectLayoutComponent>
        </div>
    );
}