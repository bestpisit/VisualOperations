import { PrismaClient } from '@prisma/client';
import { PermissionTypes, rolePermissionsMapping, RoleTypes } from '@/types/prisma/RBACTypes';

// ANSI colors for better readability
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};

import { execSync as execType } from 'child_process';
import path from 'path';
import fs from 'fs';

// Initialize execSync to null
let execSync: typeof execType | null = null;

async function loadChildProcess() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { execSync: exec } = await import('child_process');
        execSync = exec;
    }
}

// Check if console.clear exists, then clear the screen to remove the Next.js watermark
if (typeof console.clear === 'function') {
    console.clear();
}

// Set up the database
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
});

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            console.log(`${colors.cyan}🚀 Welcome to the App Startup! Let's get everything set up...${colors.reset}`);
            console.log(`${colors.yellow}🔧 App is starting up...${colors.reset}`);
            // Display the current process
            console.log(`${colors.blue}🔍 Checking for system dependencies...${colors.reset}`);

            await loadChildProcess();

            if (execSync) {
                console.log(`${colors.green}✅ Dependencies are loaded successfully!${colors.reset}`);
                console.log(`${colors.blue}🔄 Applying Prisma migrations...${colors.reset}`);
                execSync('npx prisma migrate deploy', { stdio: 'inherit' });
                console.log(`${colors.green}✅ Prisma migrations applied successfully!${colors.reset}`);
            }

            console.log(`${colors.blue}🌐 Checking database connectivity...${colors.reset}`);
            await prisma.$connect();
            console.log(`${colors.green}✅ Database connected successfully!${colors.reset}`);

            // Seed data
            await seedPermissions();
            await seedRoles();
            await seedRolePermissions();
            await seedProviders();
            await seedTemplates();
            await seedDefaultImages();

            // Check for admin user
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'changeme';
            const superAdminRole = await prisma.role.findUnique({
                where: { name: RoleTypes.SuperAdmin },
            });

            if (!superAdminRole) throw new Error('SuperAdmin role not found! Ensure roles are seeded before creating the default admin.');

            const adminUserCount = await prisma.user.count({
                where: { role: { id: superAdminRole.id } },
            });

            if (adminUserCount === 0) {
                console.log(`${colors.yellow}⚠️ No super-admin users found. Creating a default super-admin user...${colors.reset}`);
                const bcrypt = await import('bcryptjs');
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(defaultAdminPassword, saltRounds);

                await prisma.user.upsert({
                    where: { email: adminEmail },
                    update: { name: 'admin', status: 'VERIFIED', requireChangePassword: true, role: { connect: { id: superAdminRole.id } } },
                    create: { name: 'admin', email: adminEmail, password: hashedPassword, status: 'VERIFIED', requireChangePassword: true, role: { connect: { id: superAdminRole.id } } },
                });

                console.log(`${colors.green}✅ Default admin user created successfully!${colors.reset}`);
            }

            await prisma.$disconnect();

            console.log(`${colors.green}🎉 App startup completed successfully!${colors.reset}`);

        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            console.error(`${colors.red}❌ Error during startup: ${errorMessage}${colors.reset}`);
            process.exit(1);
        }
    }
}

// Function to seed permissions
async function seedPermissions() {
    const permissionValues = Object.values(PermissionTypes);
    console.log(`${colors.blue}🔧 Seeding permissions...${colors.reset}`);

    for (const permission of permissionValues) {
        const existingPermission = await prisma.permission.findUnique({
            where: { name: permission },
        });

        if (existingPermission) {
            console.log(`${colors.yellow}⚠️ Permission '${permission}' already exists, skipping.${colors.reset}`);
        } else {
            await prisma.permission.create({
                data: { name: permission },
            });
            console.log(`${colors.green}✅ Added permission '${permission}' to the database.${colors.reset}`);
        }
    }

    console.log(`${colors.green}✅ Permissions seeding completed.${colors.reset}`);
}

// Function to seed roles
async function seedRoles() {
    const roleValues = Object.values(RoleTypes);
    console.log(`${colors.blue}🔧 Seeding roles...${colors.reset}`);

    for (const role of roleValues) {
        const existingRole = await prisma.role.findUnique({
            where: { name: role },
        });

        if (existingRole) {
            console.log(`${colors.yellow}⚠️ Role '${role}' already exists, skipping.${colors.reset}`);
        } else {
            await prisma.role.create({
                data: { name: role },
            });
            console.log(`${colors.green}✅ Added role '${role}' to the database.${colors.reset}`);
        }
    }

    console.log(`${colors.green}✅ Roles seeding completed.${colors.reset}`);
}

// Function to seed role-permission mappings
async function seedRolePermissions() {
    console.log(`${colors.blue}🔧 Seeding role-permission mappings...${colors.reset}`);

    for (const roleName of Object.keys(rolePermissionsMapping) as RoleTypes[]) {
        const role = await prisma.role.findUnique({
            where: { name: roleName },
        });

        if (!role) {
            console.error(`${colors.red}❌ Role '${roleName}' not found! Skipping...${colors.reset}`);
            continue;
        }

        const permissions = rolePermissionsMapping[roleName] || [];
        console.log(`${colors.blue}🔄 Processing role '${roleName}'...${colors.reset}`);

        for (const permissionName of permissions) {
            const permission = await prisma.permission.findUnique({
                where: { name: permissionName },
            });

            if (!permission) {
                console.error(`${colors.red}❌ Permission '${permissionName}' not found! Skipping...${colors.reset}`);
                continue;
            }

            const existingRolePermission = await prisma.rolePermission.findUnique({
                where: {
                    roleId_permissionId: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                },
            });

            if (existingRolePermission) {
                console.log(`${colors.yellow}⚠️ Role '${roleName}' already has permission '${permissionName}', skipping.${colors.reset}`);
            } else {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
                console.log(`${colors.green}✅ Added permission '${permissionName}' to role '${roleName}'.${colors.reset}`);
            }
        }
    }

    console.log(`${colors.green}✅ Role-permission mappings seeding completed.${colors.reset}`);
}

export async function seedTemplates() {
    const url = await import('url');
    const fileURLToPath = url.fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const parentDir = path.resolve(__dirname, '..');

    const DATA_DIR = path.join(parentDir, 'data');
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const TEMPLATES_DIR = path.join(parentDir, 'data', 'templates');

    if (await prisma.template.count() > 0 && false) {
        console.log('⚠️ Templates already exist. Skipping seeding.');
        return;
    } else {
        // if (!fs.existsSync(TEMPLATES_DIR)) {
        console.log('🔧 Copying templates...');
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
        const PRECONFIGURED_DIR = path.join(parentDir, 'default', 'templates');
        if (fs.existsSync(PRECONFIGURED_DIR)) {
            const copyFolderRecursive = (source: string, target: string) => {
                if (!fs.existsSync(target)) {
                    fs.mkdirSync(target, { recursive: true });
                }
                fs.readdirSync(source).forEach(file => {
                    const sourcePath = path.join(source, file);
                    const targetPath = path.join(target, file);
                    if (fs.lstatSync(sourcePath).isDirectory()) {
                        copyFolderRecursive(sourcePath, targetPath);
                    } else {
                        fs.copyFileSync(sourcePath, targetPath);
                    }
                });
            };
            copyFolderRecursive(PRECONFIGURED_DIR, TEMPLATES_DIR);
            console.log('✅ Templates copied.');
        } else {
            console.warn('⚠️ Preconfigured templates directory not found. Skipping copy.');
        }
    }

    console.log('🔧 Seeding templates...');

    // 1. Gather all top-level template folders (e.g. docker, proxmox, nutanix, etc.)
    console.log('🔍 Reading template folders...');
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
                        type: templateJson.type || category,
                        details: templateJson, // entire JSON object
                    },
                    create: {
                        id: templateJson.id,
                        name: templateJson.name || sub,
                        description: templateJson.description || null,
                        type: templateJson.type || category,
                        details: templateJson, // entire JSON object
                    },
                });

                console.log(
                    `✅ Template upserted: ${upserted.name} (ID: ${upserted.id}, Category: ${upserted.type})`,
                );

                // Associate Providers (Many-to-Many)
                const templateProvidersJson = templateJson.providers as string[];

                if (templateProvidersJson && templateProvidersJson.length > 0) {
                    for (const providerName of templateProvidersJson) {
                        const provider = await prisma.terraformProvider.findUnique({
                            where: { id: providerName },
                        });

                        if (!provider) {
                            console.warn(
                                `⚠️ Provider '${providerName}' not found. Skipping association for template '${upserted.name}'.`
                            );
                            continue;
                        }

                        await prisma.templateProvider.upsert({
                            where: {
                                templateId_providerId: {
                                    templateId: upserted.id,
                                    providerId: provider.id,
                                },
                            },
                            update: {},
                            create: {
                                templateId: upserted.id,
                                providerId: provider.id,
                            },
                        });

                        console.log(
                            `🔗 Linked Template '${upserted.name}' with Provider '${provider.name}'.`
                        );
                    }
                } else {
                    console.log(
                        `ℹ️ No providers listed for template '${upserted.name}'.`
                    );
                }
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

export async function seedProviders() {
    const url = await import('url');
    const fileURLToPath = url.fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const parentDir = path.resolve(__dirname, '..');

    const DATA_DIR = path.join(parentDir, 'data');
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const PROVIDERS_DIR = path.join(parentDir, 'data', 'providers');

    if (await prisma.terraformProvider.count() > 0 && false) {
        console.log('⚠️ Providers already exist. Skipping seeding.');
        return;
    } else {
        // if (!fs.existsSync(PROVIDERS_DIR)) {
        console.log('🔧 Copying providers...');
        fs.mkdirSync(PROVIDERS_DIR, { recursive: true });
        const PRECONFIGURED_PROVIDERS_DIR = path.join(parentDir, 'default', 'providers');
        if (fs.existsSync(PRECONFIGURED_PROVIDERS_DIR)) {
            const copyFolderRecursive = (source: string, target: string) => {
                if (!fs.existsSync(target)) {
                    fs.mkdirSync(target, { recursive: true });
                }
                fs.readdirSync(source).forEach(file => {
                    const sourcePath = path.join(source, file);
                    const targetPath = path.join(target, file);
                    if (fs.lstatSync(sourcePath).isDirectory()) {
                        copyFolderRecursive(sourcePath, targetPath);
                    } else {
                        fs.copyFileSync(sourcePath, targetPath);
                    }
                });
            };
            copyFolderRecursive(PRECONFIGURED_PROVIDERS_DIR, PROVIDERS_DIR);
            console.log('✅ Providers copied.');
        } else {
            console.warn('⚠️ Preconfigured providers directory not found. Skipping copy.');
        }
    }

    console.log('🔧 Seeding providers...');

    // 1. Gather all top-level provider folders
    console.log('🔍 Reading provider folders...');
    let providerFolders: string[] = [];
    try {
        providerFolders = fs.readdirSync(PROVIDERS_DIR).filter((folder) => {
            const fullPath = path.join(PROVIDERS_DIR, folder);
            return fs.statSync(fullPath).isDirectory();
        });
    } catch (error) {
        console.error('Error reading the providers directory:', error);
        return;
    }

    // 2. Iterate over each provider folder
    for (const folder of providerFolders) {
        const templateJsonPath = path.join(PROVIDERS_DIR, folder, 'manifest.json');
        if (!fs.existsSync(templateJsonPath)) {
            console.warn(`⚠️ Missing manifest.json in '${folder}', skipping.`);
            continue;
        }

        // 3. Parse the template.json
        let templateJson: any;
        try {
            const templateContent = fs.readFileSync(templateJsonPath, 'utf-8');
            templateJson = JSON.parse(templateContent);
        } catch (error) {
            console.error(`❌ Error parsing manifest.json for '${folder}':`, error);
            continue;
        }

        // 4. Upsert in Prisma
        try {
            if (!templateJson.id) {
                console.warn(`⚠️ Provider in '${folder}' has no 'id' field, skipping upsert.`);
                continue;
            }

            const upserted = await prisma.terraformProvider.upsert({
                where: { id: templateJson.id },
                update: {
                    name: templateJson.name || folder,
                    description: templateJson.description || null,
                    details: templateJson,
                    type: templateJson.type || null,
                },
                create: {
                    id: templateJson.id,
                    name: templateJson.name || folder,
                    description: templateJson.description || null,
                    details: templateJson,
                    type: templateJson.type || null,
                },
            });

            console.log(`✅ Provider upserted: ${upserted.name} (ID: ${upserted.id})`);
        } catch (error) {
            console.error(`❌ Failed upserting provider for '${folder}':`, error);
        }
    }

    console.log('✅ Provider seeding completed.');
}

export async function seedDefaultImages() {
    const url = await import('url');
    const fileURLToPath = url.fileURLToPath;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const parentDir = path.resolve(__dirname, '..');

    const DATA_DIR = path.join(parentDir, 'data');
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const IMAGES_DIR = path.join(parentDir, 'data', 'images');

    if (await prisma.image.count() > 0 && false) {
        console.log('⚠️ Images already exist. Skipping seeding.');
        return;
    } else {
        // if (!fs.existsSync(IMAGES_DIR)) {
        console.log('🔧 Copying images...');
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        const PRECONFIGURED_IMAGES_DIR = path.join(parentDir, 'default', 'images');
        if (fs.existsSync(PRECONFIGURED_IMAGES_DIR)) {
            const copyFolderRecursive = (source: string, target: string) => {
                if (!fs.existsSync(target)) {
                    fs.mkdirSync(target, { recursive: true });
                }
                fs.readdirSync(source).forEach(file => {
                    const sourcePath = path.join(source, file);
                    const targetPath = path.join(target, file);
                    if (fs.lstatSync(sourcePath).isDirectory()) {
                        copyFolderRecursive(sourcePath, targetPath);
                    } else {
                        fs.copyFileSync(sourcePath, targetPath);
                    }
                });
            };
            copyFolderRecursive(PRECONFIGURED_IMAGES_DIR, IMAGES_DIR);
            console.log('✅ Images copied.');
        } else {
            console.warn('⚠️ Preconfigured images directory not found. Skipping copy.');
        }
    }

    console.log('🔧 Seeding images...');

    // 1. Gather all top-level image files
    console.log('🔍 Reading image files...');
    let imageFiles: string[] = [];
    try {
        imageFiles = fs.readdirSync(IMAGES_DIR).filter((file) => {
            const fullPath = path.join(IMAGES_DIR, file);
            return fs.statSync(fullPath).isFile();
        });
    } catch (error) {
        console.error('Error reading the images directory:', error);
        return;
    }

    // 2. Iterate over each image file
    for (const file of imageFiles) {
        const imageJsonPath = path.join(IMAGES_DIR, file);
        if (!fs.existsSync(imageJsonPath)) {
            console.warn(`⚠️ Missing image file in '${file}', skipping.`);
            continue;
        }

        // 3. Upsert in Prisma
        try {
            await fs.readFileSync(imageJsonPath);

            await prisma.image.upsert({
                where: {
                    key: file.split('.')[0],
                },
                create: {
                    key: file.split('.')[0],
                    filePath: file,
                },
                update: {
                    filePath: file,
                },
            })

            console.log(`✅ Image upserted: ${file}`);
        } catch (error) {
            console.error(`❌ Failed upserting image for '${file}':`, error);
        }
    }
}