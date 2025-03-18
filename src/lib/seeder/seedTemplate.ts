import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The root directory for all template folders
// e.g. data/templates/docker/, data/templates/installer/, etc.
const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'templates');

/**
 * Seeds the Prisma `Template` table by scanning the `data/templates` directory,
 * reading each `manifest.json` for high-level metadata, and each subfolder’s `template.json`
 * for specific details.
 */
export async function seedTemplates() {
    console.log('🔧 Seeding templates...');

    // 1. Gather all top-level template folders (e.g. docker, proxmox, nutanix, etc.)
    let templateFolders: string[] = [];
    try {
        templateFolders = fs.readdirSync(TEMPLATES_DIR).filter((folder) => {
            const fullPath = path.join(TEMPLATES_DIR, folder);
            return fs.statSync(fullPath).isDirectory();
        });
    } catch (error) {
        console.error('Error reading the templates directory:', error);
        return;
    }

    // 2. Iterate over each folder (category)
    for (const folder of templateFolders) {
        const manifestPath = path.join(TEMPLATES_DIR, folder, 'manifest.json');
        let manifest: any;

        // Attempt to load the manifest.json for high-level metadata
        try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            manifest = JSON.parse(manifestContent);
        } catch (error) {
            console.warn(`⚠️ No valid manifest.json for '${folder}', skipping. Error:`, error);
            continue; // Not necessarily fatal; you can skip or proceed differently.
        }

        // The category/type might be in manifest.category, or fallback to folder name
        const category: string = manifest.category || folder;

        // 3. Find all **subfolders** containing an actual `template.json`
        // e.g. docker/docker-network, proxmox/virtual-machine, etc.
        let subfolders: string[] = [];
        try {
            subfolders = fs
                .readdirSync(path.join(TEMPLATES_DIR, folder))
                .filter((sub) =>
                    fs
                        .statSync(path.join(TEMPLATES_DIR, folder, sub))
                        .isDirectory(),
                );
        } catch (error) {
            console.warn(`⚠️ Failed reading subfolders in '${folder}', skipping. Error:`, error);
            continue;
        }

        // 4. For each subfolder, read the `template.json`
        for (const sub of subfolders) {
            const templateJsonPath = path.join(TEMPLATES_DIR, folder, sub, 'template.json');
            if (!fs.existsSync(templateJsonPath)) {
                // Not all subfolders might have a template.json
                console.warn(`⚠️ Missing template.json at: ${templateJsonPath}, skipping.`);
                continue;
            }

            // 4a. Parse the template.json
            let templateJson: any;
            try {
                const templateContent = fs.readFileSync(templateJsonPath, 'utf-8');
                templateJson = JSON.parse(templateContent);
            } catch (error) {
                console.error(`❌ Error parsing template.json for '${folder}/${sub}':`, error);
                continue;
            }

            // 4b. Upsert in Prisma
            // - We use `templateJson.id` as the primary ID.
            // - We store the entire template.json into the `details` field.
            // - The `type` can be the category from the manifest (e.g. "Docker", "Proxmox", etc.)
            try {
                if (!templateJson.id) {
                    console.warn(
                        `⚠️ Template in '${folder}/${sub}' has no 'id' field, skipping upsert.`,
                    );
                    continue;
                }

                const upserted = await prisma.template.upsert({
                    where: { id: templateJson.id },
                    update: {
                        name: templateJson.name || sub,
                        description: templateJson.description || null,
                        type: category,
                        details: templateJson, // entire JSON object
                    },
                    create: {
                        id: templateJson.id,
                        name: templateJson.name || sub,
                        description: templateJson.description || null,
                        type: category,
                        details: templateJson, // entire JSON object
                    },
                });

                console.log(
                    `✅ Template upserted: ${upserted.name} (ID: ${upserted.id}, Category: ${upserted.type})`,
                );
            } catch (error) {
                console.error(
                    `❌ Failed upserting template for '${folder}/${sub}':`,
                    error,
                );
            }
        }
    }

    console.log('✅ Template seeding completed.');
}
