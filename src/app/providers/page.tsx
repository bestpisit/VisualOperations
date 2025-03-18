import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import ProvidersPage from "./ProvidersPage";

// If using the Next.js App Router with a Server Component:
export default async function TemplatePage() {
    await withAuthAndRBACServer([PermissionTypes.ProviderRead]);

    return (
        <ProvidersPage/>
    );
}
