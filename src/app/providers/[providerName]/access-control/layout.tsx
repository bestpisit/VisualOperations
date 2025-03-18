import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";

export default async function ProjectLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: { providerName: string };
}) {
    await withAuthAndRBACServer([PermissionTypes.ProviderAccessControl], { 'Provider': { 'name' : String(params.providerName) } });

    return (
        children
    );
}