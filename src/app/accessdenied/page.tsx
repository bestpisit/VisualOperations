import { auth } from '@/auth';
import SignOutButton from '@/components/logout/SignOutButton';
import { ImageInventory } from '@/images/ImageInventory';
import { DEFAULT_PAGE } from '@/lib/configurations';
import { UserVerificationStatus } from '@/types/prisma/UserVerificationStatus';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import React from 'react';

const AccessDenied = async () => {
    const session = await auth();
    if (session && session.user && session.user.status && session.user.status === UserVerificationStatus.VERIFIED) {
        return redirect(DEFAULT_PAGE);
    }

    return (
        <div className="flex-grow relative">
            {/* Overlay content */}
            <div className="z-10 relative flex flex-col h-full w-full text-white bg-secondary-400">
                <div className='bg-white flex justify-between border-b items-center relative max-h-[56px] min-h-[56px] h-[56px] z-[999] text-black text-xl md:px-20 lg:px-20 xl:px-20 sm:px-2 px-2 py-[10px]'>
                    <div className="h-[60px] justify-start items-center gap-4 inline-flex">
                        <Image src={ImageInventory.Logo.medium} alt="Logo" width={40} height={40} />
                        <div className="text-center text-secondary-300 text-xl font-normal leading-[21px] hidden sm:hidden md:block lg:block xl:block tracking-normal">VisualOperations</div>
                    </div>
                </div>
                <div className='flex-grow flex flex-col justify-center items-center'>
                    <div className="flex-col justify-start items-center gap-6 inline-flex mb-[24px]">
                        <div className="self-stretch text-center text-white text-[64px] font-semibold leading-[80px]">Access Denied</div>
                        <div className="self-stretch text-center text-white text-xl font-semibold leading-[30px]">Please wait for authorization from admin <br />Please Login Again</div>
                    </div>
                    <SignOutButton />
                </div>
            </div>
        </div>
    );
}
export default AccessDenied;
