import { PrismaAdapter } from "@auth/prisma-adapter";
import prismaLib from "@/lib/prisma"; // Adjust based on your Prisma instance location
import { User } from "@prisma/client";
import { RoleTypes } from "@/types/prisma/RBACTypes";

export function CustomPrismaAdapter(prisma: typeof prismaLib) {
    return {
        ...PrismaAdapter(prisma),
        async createUser(data: User) {
            // Fetch the role ID for "User"
            const defaultRole = await prisma.role.findUnique({
                where: { name: RoleTypes.User }, // Ensure "name" is a unique field in your Role model
            });

            if (!defaultRole) {
                throw new Error("Default role 'User' not found in the database.");
            }
            return await prisma.user.create({
                data: {
                    ...data,
                    roleId: defaultRole.id,
                }
            })
        },
    };
}
