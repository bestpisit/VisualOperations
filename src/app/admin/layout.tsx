import { auth } from "@/auth";
import { RoleTypes } from "@/types/prisma/RBACTypes";
import { redirect } from "next/navigation";
import React from "react";

export default async function StudentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    
    if (!session || !session.user) {
        redirect('/login');
    }

    if (!(session.user.role === RoleTypes.SuperAdmin) && !(session.user.role === RoleTypes.Admin)) {
        redirect('/unauthorized');
    }
    return (
        <div className="flex-grow relative w-full h-full">
            {children}
        </div>
    );
}