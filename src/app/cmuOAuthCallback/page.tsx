import { redirect } from 'next/navigation';

export default async function CmuOAuthCallback({ searchParams }: { searchParams: { code?: string; state?: string } }) {
    const { code, state } = searchParams;

    if (!code || !state) {
        return redirect('/login');
    }

    return redirect(`/api/auth/callback/cmu?code=${code}&state=${state}`);
}