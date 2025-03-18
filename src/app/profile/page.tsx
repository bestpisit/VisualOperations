import { auth } from '@/auth'
import { redirect } from 'next/navigation';
import React from 'react'
import ProfilePage from './ProfilePage';

const Profile = async () => {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
        return redirect('/login');
    }
    return (
        <ProfilePage user={session.user} />
    )
}

export default Profile