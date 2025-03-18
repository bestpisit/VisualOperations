import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import { RoleTypes } from "@/instrumentation";

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's postal address. */
            role: RoleTypes;
            status: string;
            id: string;
            requireChangePassword: boolean;
        } & DefaultSession['user'],
        accessToken: JWT;
    }
}