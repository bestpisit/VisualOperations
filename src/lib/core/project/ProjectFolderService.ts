import { PlatformPaths } from '@/types/PlatformStructure';
import fs from 'fs';
import path from 'path';

export class ProjectFolderService {
    private projectUUID: string;

    constructor(projectUUID: string) {
        this.projectUUID = projectUUID;
    }

    createProjectFolder() {
        const projectPath = path.join(PlatformPaths.PROJECTS, this.projectUUID);

        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
            console.log(`Project folder created at: ${projectPath}`);
        } else {
            console.log(`Folder already exists for project: ${this.projectUUID}`);
        }

        this.createSubFolder('terraform');
        this.createSubFolder('modules');

        return projectPath;
    }

    createSubFolder(subPath: string) {
        const fullPath = path.join(PlatformPaths.PROJECTS, this.projectUUID, subPath);

        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`Subfolder created at: ${fullPath}`);
        }
        return fullPath;
    }

    deleteProjectFolder() {
        const projectPath = path.join(PlatformPaths.PROJECTS, this.projectUUID);
    
        if (fs.existsSync(projectPath)) {
            fs.rmSync(projectPath, { recursive: true, force: true });
            console.log(`Project folder deleted: ${projectPath}`);
        } else {
            console.log(`No folder found for project: ${this.projectUUID}`);
        }
    }    
}