import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';
import type { Profile } from 'next-auth';
import axios from 'axios';
import { CmuOAuthBasicInfo } from '@/types/CMUOAuth/CmuOAuthBasicInfo';

interface CMUOAuthProfile extends Profile {
    cmuitaccount: string;
    firstname_EN: string;
    lastname_EN: string;
    student_id?: string;
}

export default function CMUOAuthProvider<P extends CmuOAuthBasicInfo>(
    options: OAuthUserConfig<P>
): OAuthConfig<P> {
    return {
        id: 'cmu',
        name: 'CMU',
        type: 'oauth',
        authorization: {
            url: 'https://oauth.cmu.ac.th/v1/Authorize.aspx',
            params: {
                response_type: 'code',
                client_id: options.clientId,
                redirect_uri: process.env.CMU_OAUTH_REDIRECT_URL!,
                scope: 'cmuitaccount.basicinfo',
                state: 'xyz',
            },
        },
        token: {
            url: `${process.env.CMU_OAUTH_GET_TOKEN_URL!}?grant_type=authorization_code&redirect_uri=${encodeURIComponent(
                process.env.CMU_OAUTH_REDIRECT_URL!
            )}&client_id=${process.env.CMU_OAUTH_CLIENT_ID!}&client_secret=${process.env.CMU_OAUTH_CLIENT_SECRET!}`,
            async conform(response: Response) {
                // Parse the JSON body from the response
                const data = await response.json();
        
                // Ensure access_token exists
                if (!data.access_token) {
                    throw new Error("Access token is missing in the response");
                }
        
                // Ensure token_type exists or default to 'Bearer'
                if (!data.token_type) {
                    data.token_type = "Bearer";
                }
        
                // Return the transformed response to match expected structure
                return new Response(
                    JSON.stringify({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        token_type: data.token_type,
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
            url: 'https://misapi.cmu.ac.th/cmuitaccount/v1/api/cmuitaccount/basicinfo', // Specify the userinfo endpoint
            async request(context: any) {
                const { tokens } = context;

                const response = await axios.get<CmuOAuthBasicInfo>('https://misapi.cmu.ac.th/cmuitaccount/v1/api/cmuitaccount/basicinfo', {
                    headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                console.log(response.data);
                //convert response.data to profile
                const profile: CMUOAuthProfile = {
                    cmuitaccount: response.data.cmuitaccount,
                    firstname_EN: response.data.firstname_EN,
                    lastname_EN: response.data.lastname_EN,
                    student_id: response.data.student_id,
                };
                return profile;
            },
        },
        profile(profile: P) {
            return {
                id: profile.cmuitaccount,
                name: `${profile.firstname_EN} ${profile.lastname_EN}`,
                email: profile.cmuitaccount,
                image: null
            };
        },
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        style: {
            logo: '@/images/CMULogo.png', // Provide the path to your CMU logo
            bg: '#FFFFFF',
            text: '#000000',
        },
    };
}
