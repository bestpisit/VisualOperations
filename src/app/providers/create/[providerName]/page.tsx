import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import prisma from "@/lib/prisma";
import { parsePrismaJson } from "@/lib/utility/prismaUtility";
import { ProviderTemplate } from "@/types/PlatformStructure";
import CreateProviderPage from "./CreateProviderPage";
import { redirect } from "next/navigation";

// If using the Next.js App Router with a Server Component:
export default async function TemplatePage({
    params,
}: {
    params: { providerName: string };
}) {
    await withAuthAndRBACServer([PermissionTypes.ProviderEdit]);

    if (!params.providerName) {
        return redirect(`/providers/create`);
    }

    const terraformProviders = await prisma.terraformProvider.findUnique(
        {
            where: {
                id: params.providerName,
            },
        }
    );

    if (!terraformProviders) {
        return redirect(`/providers/create`);
    }

    const providerDetails = parsePrismaJson<ProviderTemplate>(terraformProviders.details as string);

    if (!!providerDetails.resourceProvider) {
        return redirect(`/providers/create`);
    }

    // providerDetails.inputs = providerDetails.inputs.filter(inputt => !inputt.configuration);

    return (
        <CreateProviderPage provider={providerDetails}/>
    );
}