import path from "path";
import { PlatformPaths } from "@/types/PlatformStructure";
import fs from "fs";
import prisma from "@/lib/prisma";
import { Image } from "@prisma/client";
import { ApiError } from "@/types/api/apiError";
import mime from "mime";

export const DefaultImageKeyMapping: Record<string, string> = {
    PostgreSQL: "PostgreSQL",
    Redis: "Redis",
    Docker: "Docker",
    Server: "Server",
    Nginx: "Nginx",
    Terraform: "Terraform",
    Nutanix: "Nutanix",
    Proxmox: "Proxmox",
    MySQL: "MySQL"
};

export class ImageInventoryManager {
    private static workingDir = path.join(PlatformPaths.IMAGES);

    static getImageUrl(imageKey: string) {
        return `/api/images/${imageKey}`;
    }

    static async getImageFilePath(imageKey: string): Promise<string> {
        const imageData = await prisma.image.findUnique({
            where: { key: imageKey },
        });
        if (imageData) {
            return imageData.filePath;
        }
        else {
            throw ApiError.notFound(`Image not found: ${imageKey}`);
        }
    }

    static async createImage(key: string, fileBuffer: Buffer, fileName: string): Promise<Image> {
        const filePath = path.join(this.workingDir, fileName);

        // Save file locally
        await new Promise<void>((resolve, reject) => {
            fs.writeFile(filePath, fileBuffer, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Save metadata in DB
        return await prisma.image.create({
            data: { key, filePath: fileName },
        });
    }

    static async getImageFileStream(imageKey: string): Promise<{ stream: fs.ReadStream; mimeType: string }> {
        try {
            const imagePath = await ImageInventoryManager.getImageFilePath(imageKey);
            if (!imagePath) {
                throw new Error(`Image not found: ${imageKey}`);
            }

            const fullPath = path.join(this.workingDir, imagePath);

            // Check if file exists asynchronously
            await fs.promises.access(fullPath, fs.constants.F_OK);

            // Get the MIME type from the actual file extension
            const mimeType = mime.getType(fullPath) || "application/octet-stream";

            return { stream: fs.createReadStream(fullPath), mimeType };
        } catch (error) {
            console.error(`Error reading image stream for ${imageKey}:`, error);
            throw new Error(`Image not found: ${imageKey}`);
        }
    }
}

export default ImageInventoryManager;