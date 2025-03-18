import { NextRequest, NextResponse } from "next/server";
import ImageInventoryManager from "@/images/ImageInventoryManager";
import { withAPIHandler, withAuth } from "@/lib/middleware/apiWithMiddleware";
import { ApiError } from "@/types/api/apiError";
import { validateWithSchema } from "@/types/schemas/zod";
import { z } from "zod";

export async function GET(request: NextRequest, { params }: { params: { imageKey: string } }) {
    return withAPIHandler(
        withAuth(
            async () => {
                const imageKey = params.imageKey as string;

                validateWithSchema(z.string(), imageKey);

                const { stream, mimeType }  = await ImageInventoryManager.getImageFileStream(imageKey);

                if (!stream) {
                    throw ApiError.notFound(`Image not found: ${imageKey}`);
                }

                return new NextResponse(stream as any, {
                    headers: {
                        "Content-Type": mimeType, // ✅ Fix: Ensure correct MIME type
                        "Cache-Control": "max-age=3600",
                    },
                });
            }
        )
    )(request);
}