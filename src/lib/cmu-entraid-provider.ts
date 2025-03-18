import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import axios from "axios";

interface MicrosoftEntraIDProfile {
    sub: string; // Unique user identifier
    name: string;
    email: string;
    preferred_username?: string;
}

export default function CMUEntraIDProvider<P extends MicrosoftEntraIDProfile>(
    options: OAuthUserConfig<P>
): OAuthConfig<P> {
    return {
        id: "cmu-entra-id",
        name: "Microsoft Entra ID",
        type: "oauth",
        authorization: {
            url: "https://login.microsoftonline.com/cf81f1df-de59-4c29-91da-a2dfd04aa751/oauth2/v2.0/authorize",
            params: {
                response_type: "code",
                client_id: options.clientId,
                redirect_uri: process.env.AUTH_MICROSOFT_ENTRA_ID_REDIRECT_URL || "http://localhost:3000/cmuEntraIDCallback",
                scope: "openid profile email User.Read User.ReadBasic.All",
                prompt: "consent",
            },
        },
        token: {
            url: `https://login.microsoftonline.com/cf81f1df-de59-4c29-91da-a2dfd04aa751/oauth2/v2.0/token`,
            async conform(response: Response) {
                const data = await response.json();

                console.log("Token Response:", JSON.stringify(data));

                if (!data.access_token) {
                    throw new Error("Access token is missing in the response");
                }

                return new Response(
                    JSON.stringify({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        token_type: data.token_type || "Bearer",
                        expires_in: data.expires_in,
                    }),
                    {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                    }
                );
            },
        },
        userinfo: {
            url: "https://graph.microsoft.com/oidc/userinfo",
            async request(context: any) {
                const { tokens } = context;

                const response = await axios.get<MicrosoftEntraIDProfile>(
                    "https://graph.microsoft.com/oidc/userinfo",
                    {
                        headers: { Authorization: `Bearer ${tokens.access_token}` },
                    }
                );
                
                return {
                    sub: response.data.sub,
                    name: response.data.name,
                    email: response.data.email,
                    preferred_username: response.data.preferred_username,
                };
            },
        },
        profile(profile: P) {
            return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: null,
            };
        },
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        style: {
            logo: "/path/to/microsoft-logo.png",
            bg: "#0078D4",
            text: "#FFFFFF",
        },
    };
}