import NextAuth, { CredentialsSignin } from "next-auth";
import authConfig from "./auth.config";
import prisma from "@/lib/prisma";
import { RoleTypes } from "@/types/prisma/RBACTypes";
import { UserVerificationStatus } from "@/types/prisma/UserVerificationStatus";
import { CustomPrismaAdapter } from "./lib/CustomPrismaAdapter";

export const { auth, handlers, signIn, signOut } = NextAuth({
    adapter: CustomPrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 15 * 60, // 15 minutes
        updateAge: 15 * 60, // Update the token every 15 minutes
    },
    callbacks: {
        authorized: async ({ auth }) => {
            return !!auth;
        },
        async jwt({ token, user }) {
            const now = Math.floor(Date.now() / 1000); // Current time in seconds
        
            // 🔴 If token expired, force logout
            if (token?.exp && now > token.exp) {
                console.log("Token has expired.");
                return null;
            }
        
            if (user) {
                token.exp = now + 15 * 60; // Extend token lifespan (15 min)
                const userAccount = await prisma.user.findUnique({
                    where: { email: user.email || "" },
                    select: { tokenVersion: true, status: true, role: { select: { name: true } } },
                });
        
                if (!userAccount) return null; // Ensure user exists
        
                token.tokenVersion = userAccount.tokenVersion;
                token.status = userAccount.status || UserVerificationStatus.PENDING;
                token.role = userAccount.role?.name as RoleTypes;
            } else if (token.email) {
                const userAccount = await prisma.user.findUnique({
                    where: { email: token.email || "" },
                    select: { tokenVersion: true, status: true, role: { select: { name: true } } },
                });
        
                // 🔴 If user doesn't exist or tokenVersion changed, invalidate token
                if (!userAccount || userAccount.tokenVersion !== token.tokenVersion) {
                    console.log("User token is no longer valid. Forcing logout.");
                    return null;
                }
        
                token.status = userAccount.status || UserVerificationStatus.PENDING;
                token.role = userAccount.role?.name as RoleTypes;
            }
        
            return token;
        },        
        async signIn() {
            return true;
        },
        async session({ session, token }) {
            const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

            // Check if token has expired
            if (token.exp && currentTime > token.exp) {
                console.log("Token has expired.");
                token.invalid = true;
            } 

            const userAccount = await prisma.user.findUnique({
                where: { email: session.user.email || "" },
                include: { role: true },
            });

            if (userAccount) {
                session.user = {
                    ...session.user,
                    id: userAccount.id,
                    status: userAccount.status,
                    role: userAccount.role?.name as RoleTypes,
                    requireChangePassword: userAccount.requireChangePassword,
                    image: session.user.image || null,
                };
                token.status = userAccount.status;
            } else {
                throw new CredentialsSignin("Invlid Credential");
            }

            if (token.invalid) {
                session.user.status = UserVerificationStatus.INVALID;
            }

            session.accessToken = token;
            session.accessToken.status = session.user.status;

            return session;
        },
        async redirect({ url, baseUrl }) {
            return url.startsWith("/") || url.startsWith(baseUrl) ? url : baseUrl;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    ...authConfig
});
