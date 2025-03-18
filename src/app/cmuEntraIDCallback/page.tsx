import { redirect } from "next/navigation";

export default async function CmuOAuthCallback({
    searchParams,
}: {
    searchParams: { code?: string; state?: string; session_state?: string };
}) {
    const { code, session_state } = searchParams;

    if (!code) {
        return redirect("/login");
    }

    return redirect(`/api/auth/callback/cmu-entra-id?code=${code}&state=${session_state}&session_state=${session_state}`);
} 