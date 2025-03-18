import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import CMUEntraIDProvider from "./lib/cmu-entraid-provider";

// Function to validate a password
async function validatePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
}

// Notice this is only an object, not a full Auth.js instance
export default {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "jsmith" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials.password || typeof credentials.password !== 'string' || typeof credentials.username !== 'string') {
                    throw new CredentialsSignin("Username and password are required");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.username },
                });

                if (!user || !user.password || !(await validatePassword(credentials.password, user.password))) {
                    // Throwing a generic error for invalid credentials
                    throw new CredentialsSignin("Invalid credentials");
                }

                // 🔴 Increment token version on login to invalidate old sessions
                await prisma.user.update({
                    where: { id: user.id },
                    data: { tokenVersion: { increment: 1 } },
                });

                return { id: user.id, name: user.name, email: user.email };
            },
        }),
        // CMUOAuthProvider({
        //     clientId: process.env.CMU_OAUTH_CLIENT_ID!,
        //     clientSecret: process.env.CMU_OAUTH_CLIENT_SECRET!,
        // }),
        MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: "https://login.microsoftonline.com/cf81f1df-de59-4c29-91da-a2dfd04aa751/v2.0",
            authorization: {
                params: {
                    redirect_uri: process.env.REDIRECT_PROXY_URL || "http://localhost:3000/cmuEntraIDCallback",
                    scope: "openid profile email User.Read",
                    prompt: "consent", // Forces the consent screen
                },
            },
        }),
        CMUEntraIDProvider({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
        })
    ],
    // debug: true
} satisfies NextAuthConfig