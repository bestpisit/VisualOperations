import prisma from '@/lib/prisma';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import { DeploymentConfiguration, DeploymentTemplate, InputTypes, PlatformPaths } from '@/types/PlatformStructure';
import fs from 'fs';
import path from 'path';
import { ProjectManagement } from './ProjectManagement';
import { Template } from '@prisma/client';
import { ApiError } from '@/types/api/apiError';
import { deploymentTemplateSchema, validateWithSchema } from '@/types/schemas/zod';

export class TemplateService {
    private projectUUID: string;

    constructor(projectUUID: string) {
        this.projectUUID = projectUUID;
    }

    async importTemplate(templateId: string) {
        try {
            // Step 1: Check if project folder exists
            const projectPath = PlatformPaths.PROJECT(this.projectUUID);
            if (!fs.existsSync(projectPath)) {
                throw new Error(`Project folder not found for project: ${this.projectUUID}`);
            }

            // Step 2: Retrieve template data from the database
            const templateData = await prisma.template.findUnique({
                where: { id: templateId }
            });

            if (!templateData) {
                throw new Error(`Template not found for id: ${templateId}`);
            }

            if (!templateData.details) {
                throw new Error(`Template details not found for id: ${templateId}`);
            }

            const { category, subcategory } = parsePrismaJson<{ category: string, subcategory: string }>(
                templateData.details as string
            );

            // Step 3: Build source path and validate
            const sourcePath = path.join(PlatformPaths.TEMPLATES, category, subcategory);
            if (!sourcePath.startsWith(PlatformPaths.TEMPLATES)) {
                throw new Error(`Invalid source path: ${sourcePath}`);
            }

            // Step 4: Check if template.json exists
            const templateJsonPath = path.join(sourcePath, 'template.json');
            if (!fs.existsSync(templateJsonPath)) {
                throw new Error(`template.json not found at: ${templateJsonPath}`);
            }

            // Step 5: Ensure destination folders exist
            ProjectManagement.getProject(this.projectUUID).folderInstance.createSubFolder('modules');
            const destinationFolder = path.join(projectPath, 'modules', templateData.id);

            // Step 6: Copy template files if the destination folder doesn't exist
            if (!fs.existsSync(destinationFolder)) {
                try {
                    fs.cpSync(sourcePath, destinationFolder, { recursive: true });
                    console.log(`Template copied from ${sourcePath} to ${destinationFolder}`);
                } catch (copyError: any) {
                    throw new Error(`Failed to copy template: ${copyError.message}`);
                }
            } else {
                //Replace the existing template folder with the new one
                try {
                    fs.rmSync(destinationFolder, { recursive: true, force: true });
                    fs.cpSync(sourcePath, destinationFolder, { recursive: true });
                    console.log(`Template copied from ${sourcePath} to ${destinationFolder}`);
                } catch (copyError: any) {
                    throw new Error(`Failed to copy template: ${copyError.message}`);
                }
            }

            // Step 7: Upsert project-template relationship in the database
            await prisma.projectTemplate.upsert({
                where: {
                    projectUUID_templateId: {
                        projectUUID: this.projectUUID,
                        templateId: templateData.id
                    }
                },
                update: {
                    template: {
                        connect: { id: templateData.id }
                    }
                },
                create: {
                    project: {
                        connect: { uuid: this.projectUUID }
                    },
                    template: {
                        connect: { id: templateData.id }
                    }
                }
            });

            return destinationFolder;
        } catch (error: any) {
            // Log the error for debugging
            console.error(`Error in importTemplate: ${error.message}`, error);

            // Re-throw the error for the caller to handle or provide a user-friendly message
            throw new Error('Failed to import template. Please check the logs for details.');
        }
    }

    async removeTemplate(templateId: string) {
        try {
            // Step 1: Validate project and template existence
            const projectPath = PlatformPaths.PROJECT(this.projectUUID);
            if (!fs.existsSync(projectPath)) {
                throw new Error(`Project folder not found for project: ${this.projectUUID}`);
            }

            const templateData = await prisma.template.findUnique({
                where: { id: templateId }
            });

            if (!templateData) {
                throw new Error(`Template not found for id: ${templateId}`);
            }

            const destinationFolder = path.join(projectPath, 'modules', templateData.id);

            // Step 2: Check if template folder exists in the project
            if (!fs.existsSync(destinationFolder)) {
                console.warn(`Template folder not found at: ${destinationFolder}, skipping folder removal.`);
            } else {
                // Step 3: Remove the template folder
                try {
                    fs.rmSync(destinationFolder, { recursive: true, force: true });
                    console.log(`Template folder removed: ${destinationFolder}`);
                } catch (rmError: any) {
                    throw new Error(`Failed to remove template folder: ${rmError.message}`);
                }
            }

            // Step 4: Remove project-template association from database
            await prisma.projectTemplate.deleteMany({
                where: {
                    projectUUID: this.projectUUID,
                    templateId
                }
            });

            console.log(`Template association removed from project ${this.projectUUID}`);

            return { message: 'Template removed successfully' };
        } catch (error: any) {
            console.error(`Error in removeTemplate: ${error.message}`, error);
            throw new Error('Failed to remove template. Please check the logs for details.');
        }
    }

    async validateTemplate(templateId: Template['id'], config: DeploymentConfiguration) {
        const template = await prisma.template.findUnique({
            where: { id: templateId }
        });
        if (!template) {
            throw ApiError.notFound('Template not found');
        }
        const templateDetails = parsePrismaJson(template.details) as unknown as DeploymentTemplate;
        validateWithSchema(deploymentTemplateSchema, templateDetails);
        for (const input of templateDetails.inputs) {
            if (input.type === InputTypes.Providers) {
                const inputInfo = input.name.split('_');
                if (inputInfo.length !== 2 || inputInfo[0] !== 'provider') {
                    throw ApiError.badRequest('Invalid provider input name');
                }
                if (inputInfo[1] && !templateDetails.providers?.includes(inputInfo[1])) {
                    throw ApiError.badRequest('Provider not found in template');
                }
            }
            if (input.type === InputTypes.Map) {
                if (!config[input.name]) {
                    throw ApiError.badRequest(`Missing input value for ${input.name}`);
                }
                if (typeof config[input.name] !== 'object') {
                    throw ApiError.badRequest(`Invalid input value for ${input.name}`);
                }
                const map = config[input.name].value as Record<string, unknown>;
                for (const [key, value] of Object.entries(map)) {
                    if (!value || value === '') {
                        throw ApiError.badRequest(`Invalid input value for ${input.name}.${key}`);
                    }
                }
            }
        }
    }
}