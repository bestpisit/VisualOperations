import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { uuid: string };  // Access uuid from dynamic route
}) {
    await withAuthAndRBACServer([PermissionTypes.ProjectRead], { 'Project': { 'uuid' : String(params.uuid) } });

    return (
        children
    );
}