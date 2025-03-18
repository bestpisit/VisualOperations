'use client';

import { signOut } from 'next-auth/react';
import React from 'react';

const SignOutButton = () => {
    const handleLogout = async () => {
        await signOut({ redirectTo: '/login' });
    };
    return (
        <button onClick={handleLogout} className="h-[50px] px-6 py-2 bg-secondary-300 rounded-[32px] justify-center items-center gap-2.5 inline-flex">
            <div className="text-white text-base font-normal leading-[21px]">Login</div>
        </button>
    );
};

export default SignOutButton;