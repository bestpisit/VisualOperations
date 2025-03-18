"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserVerificationStatus } from "@/types/prisma/UserVerificationStatus";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import { ROUTES } from "../route";
import { adminMiddleware, rbacMiddleware } from "./rbacMiddleware";
import { readProjects } from "@/app/api/projects/function";

export async function withAuthServer<T>(): Promise<T | void> {
    const session = await auth();

    // 2. Redirect or notFound if not authenticated
    if (!session?.user?.email) {
        return redirect(ROUTES.LOGIN);
    }

    // 3. Check if user is verified
    if (session.user.status !== UserVerificationStatus.VERIFIED) {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 5. Return session if all checks pass
    return session as T;
}

export async function withAuthAndAdminServer<T>(): Promise<T | void> {
    const session = await auth();

    // 2. Redirect or notFound if not authenticated
    if (!session?.user?.email) {
        return redirect(ROUTES.LOGIN);
    }

    // 3. Check if user is verified
    if (session.user.status !== UserVerificationStatus.VERIFIED) {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 4. Perform RBAC check
    try {
        await adminMiddleware(session);
    } catch {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 5. Return session if all checks pass
    return session as T;
}

export async function withAuthAndRBACServer<T>(
    permissionMap: PermissionTypes[],
    resources: Record<string, any | undefined> = {}
): Promise<T | void> {
    const session = await auth();

    // 2. Redirect or notFound if not authenticated
    if (!session?.user?.email) {
        return redirect(ROUTES.LOGIN);
    }

    // 3. Check if user is verified
    if (session.user.status !== UserVerificationStatus.VERIFIED) {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 4. Perform RBAC check
    try {
        await rbacMiddleware(session, permissionMap, resources);
    } catch {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 5. Return session if all checks pass
    return session as T;
}

export async function withAuthAndHasProject<T>(): Promise<T | void> {
    const session = await auth();

    // 2. Redirect or notFound if not authenticated
    if (!session?.user?.email) {
        return redirect(ROUTES.LOGIN);
    }

    // 3. Check if user is verified
    if (session.user.status !== UserVerificationStatus.VERIFIED) {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 4. Perform RBAC check
    try {
        const projects = await readProjects(session.user.id);
        if (projects.length === 0) {
            return redirect(ROUTES.UNAUTHORIZED);
        }
    } catch {
        return redirect(ROUTES.UNAUTHORIZED);
    }

    // 5. Return session if all checks pass
    return session as T;
}