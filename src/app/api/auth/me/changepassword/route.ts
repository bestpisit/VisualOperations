export const dynamic = 'force-dynamic';
import { auth } from "@/auth";
import { withAPIHandler, withAuth } from "@/lib/middleware/apiWithMiddleware";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/security/authentication";
import { ApiError } from "@/types/api/apiError";
import bcrypt from "bcryptjs";

async function changePassword(req: Request) {
    const session = await auth();
    if (!session || !session.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { currentPassword, newPassword } = await req.json();

    // Check if currentPassword and newPassword are provided
    if (!currentPassword || !newPassword) {
        return Response.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    try {
        // Get the user by ID
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user || !user.password) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Compare the current password with the stored hash
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        if(user.requireChangePassword){
            // Update the user's password in the database
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, requireChangePassword: false },
            });
        }
        else{
            // Update the user's password in the database
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, tokenVersion: {increment: 1} },
            });
        }

        // Respond with success
        return Response.json({ success: 'Password updated successfully' });

    } catch (error: any) {
        throw ApiError.internalServerError(error.message);
    }
}

export const POST = withAPIHandler(withAuth(changePassword));