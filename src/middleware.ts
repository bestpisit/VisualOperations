// middleware.ts

import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { UserVerificationStatus } from "./types/prisma/UserVerificationStatus";

// NextAuth usage
const { auth } = NextAuth(authConfig);

// We still have our normal secret for sessions:
const sessionSecret = process.env.AUTH_SECRET;

export default auth(async (req) => {
    let token = await getToken({
        req,
        secret: sessionSecret,
        cookieName: "__Secure-authjs.session-token",
    });

    if (token === null) {
        token = await getToken({
            req,
            secret: sessionSecret,
            cookieName: "authjs.session-token",
        });
    }

    const headers = new Headers(req.headers);

    // 3) Perform the logging request as before, but with ephemeral token
    if (req.nextUrl.pathname !== "/api/log" && process.env.ALLOW_LOGGING === "true") {
        const xForwardedFor = req.headers.get("x-forwarded-for");
        let realIp = "unknown";

        if (xForwardedFor) {
            // If multiple IPs, pick the first one
            realIp = xForwardedFor.split(",")[0].trim();
        } else if (req.ip) {
            // fallback to req.ip
            realIp = req.ip;
        }
        const logData = {
            userEmail: token?.email || null,
            method: req.method,
            path: `${req.nextUrl.pathname}${req.nextUrl.search}`,
            ip: realIp,
            type: "requestlog",
            userRole: null,
        } as any;

        if (token?.role && token?.email) {
            logData.type = "accesslog";
            logData.userRole = token.role || null;
        }

        headers.set("X-UserEmail", logData.userEmail || "unknown");
        headers.set("X-UserRole", logData.userRole || "unknown");
        headers.set("Access-Log", JSON.stringify(logData));
    }

    if (token) {
        const now = Math.floor(Date.now() / 1000);
        if (token?.exp && token.exp < now) {
            const newUrl = new URL("/api/auth/signout", req.nextUrl.origin);
            return NextResponse.redirect(newUrl);
        }
    }
    if (!req.auth && req.nextUrl.pathname !== "/login") {
        const newUrl = new URL("/login", req.nextUrl.origin);
        if (req.nextUrl.pathname !== "/") {
            newUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
        }
        return NextResponse.redirect(newUrl);
    }
    if (token === null && req.nextUrl.pathname !== "/login") {
        const newUrl = new URL("/login", req.nextUrl.origin);
        if (req.nextUrl.pathname !== "/") {
            newUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
        }
        return NextResponse.redirect(newUrl);
    } else if (
        token &&
        token.status &&
        token.status !== UserVerificationStatus.VERIFIED &&
        req.nextUrl.pathname !== "/accessdenied"
    ) {
        const newUrl = new URL("/accessdenied", req.nextUrl.origin);
        return NextResponse.redirect(newUrl);
    } else if (
        token &&
        token.status &&
        token.status === UserVerificationStatus.INVALID &&
        req.nextUrl.pathname !== "/api/auth/signout"
    ) {
        const newUrl = new URL("/api/auth/signout", req.nextUrl.origin);
        return NextResponse.redirect(newUrl);
    }

    headers.set("x-current-path", req.nextUrl.pathname);

    return NextResponse.next({ headers });
});

export const config = {
    matcher: [
        "/((?!api/auth|api/log|_next/static|_next/image|favicon.ico|static|manifest.webmanifest|apple-touch-icon.png).*)",
    ],
};