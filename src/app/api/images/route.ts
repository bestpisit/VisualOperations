import { NextResponse } from "next/server";
import ImageInventoryManager from "@/images/ImageInventoryManager";
import { withAPIHandler, withAuthAndSuperAdmin } from "@/lib/middleware/apiWithMiddleware";
import { ApiError } from "@/types/api/apiError";

export const dynamic = 'force-dynamic'; // Adjust if needed
export const runtime = 'nodejs'; // Ensures compatibility with Node.js

export const POST = withAPIHandler(withAuthAndSuperAdmin(async (request) => {
    try {
        // Extract formData directly from NextRequest
        const formData = await request.formData();
        const file = formData.get("file") as Blob | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Convert Blob to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Extract file key from name (remove extension)
        const key = file.name.split(".")[0];
        if (!key) {
            throw ApiError.badRequest("Invalid filename");
        }

        // Store image buffer in ImageInventoryManager (no public folder)
        const newImage = await ImageInventoryManager.createImage(key, fileBuffer, file.name);

        return NextResponse.json({
            message: "Image uploaded successfully",
            imageUrl: `/api/image/${newImage.key}`, // Return API route to retrieve the image
        }, { status: 201 });

    } catch (error) {
        console.error("File upload error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}));