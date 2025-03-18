import TemplatesPage from "./TemplatesPage";
import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import prisma from "@/lib/prisma";
import { DeploymentTemplate, DeploymentType } from "@/types/PlatformStructure";
import { PermissionTypes } from "@/types/prisma/RBACTypes";

// If using the Next.js App Router with a Server Component:
export default async function TemplatePage() {
    await withAuthAndRBACServer([PermissionTypes.TemplateRead]);
    // Fetch all templates from DB
    const prismaTemplates = await prisma.template.findMany();
    if (!prismaTemplates?.length) {
        return <div>No templates found</div>;
    }

    // We'll collect TemplateData items for <TemplatesPage />
    const templates: DeploymentTemplate[] = [];
    const categoriesSet = new Set<string>();
    const subcategoriesMap: Record<string, Set<string>> = {};

    // Transform Prisma templates into the shape your TemplatesPage expects
    for (const t of prismaTemplates) {
        // Safely read `details` from DB, typed as PrismaTemplateDetails
        const details = t.details as DeploymentTemplate | null;

        const category = details?.category || "Uncategorized";
        const subcategory = details?.subcategory || "Unspecified";

        // Track categories & subcategories
        categoriesSet.add(category);
        if (!subcategoriesMap[category]) {
            subcategoriesMap[category] = new Set();
        }
        subcategoriesMap[category].add(subcategory);

        // Determine an imageKey from DB or our fallback map
        const imageKey = details?.imageKey || ["Terraform"];

        templates.push({
            id: t.id,
            name: t.name,
            description: t.description ?? "",
            category: category,
            subcategory: subcategory,
            inputs: details?.inputs || [],
            providers: details?.providers || [],
            type: details?.type || DeploymentType.Infrastructure,
            imageKey: imageKey,
            outputs: details?.outputs || [],
        });
    }

    // Convert Sets to arrays for subcategories
    const categories = Array.from(categoriesSet);
    const subcategories: Record<string, string[]> = {};
    for (const category of categories) {
        subcategories[category] = Array.from(subcategoriesMap[category]);
    }

    // Render the same <TemplatesPage /> but with DB data
    return (
        <TemplatesPage
            templates={templates}
            categories={categories}
            subcategories={subcategories}
        />
    );
}
