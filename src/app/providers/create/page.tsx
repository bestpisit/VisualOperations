import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { parsePrismaJson } from "@/lib/utility/prismaUtility";
import { ProviderTemplate } from "@/types/PlatformStructure";
import { TerraformProvider } from "@prisma/client";

// If using the Next.js App Router with a Server Component:
export default async function TemplatePage() {
    await withAuthAndRBACServer([PermissionTypes.ProviderEdit]);

    let terraformProviders = await prisma.terraformProvider.findMany();

    const filterOutResourceProviders = (provider: TerraformProvider) => {
        const providerDetails = parsePrismaJson<ProviderTemplate>(provider.details as string);
        return !providerDetails.resourceProvider;
    }

    terraformProviders = terraformProviders.filter(provider=>filterOutResourceProviders(provider));

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Select Provider to Create</h1>
            <div>
                <h2 className="text-xl font-semibold mb-4">Step 1: Choose a Provider Template</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {terraformProviders.map((provider, index) => (
                        <Link
                            key={index}
                            className="border p-4 rounded shadow cursor-pointer hover:bg-gray-100"
                            href={`/providers/create/${provider.id}`}
                        >
                            <h3 className="text-lg font-semibold">{provider.name}</h3>
                            <p>{provider.description}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
