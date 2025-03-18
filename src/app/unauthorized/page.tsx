'use client';
import { Button } from '@/components/ui/button';
import { ImageInventory } from '@/images/ImageInventory';
import { ROUTES } from '@/lib/route';
import { Home } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React from 'react';

const Unauthorized = () => {
    const router = useRouter();
    return (
        <div className="flex-grow relative">
            <div className="z-10 relative flex flex-col h-full w-full text-white bg-[rgb(51,58,66)] bg-opacity-70">
                <div className='bg-white flex justify-between border-b items-center relative max-h-[56px] min-h-[56px] h-[56px] z-[999] text-black text-xl md:px-20 lg:px-20 xl:px-20 sm:px-2 px-2 py-[10px]'>
                    <div className="h-[60px] justify-start items-center gap-4 inline-flex">
                        <Image src={ImageInventory.Logo.medium} alt="Logo" width={40} height={40} />
                        <div className="text-center text-[#9932cc] text-xl font-normal leading-[21px] hidden sm:hidden md:block lg:block xl:block tracking-normal">VisualOperations</div>
                    </div>
                </div>
                <div className='flex-grow flex flex-col justify-center items-center'>
                    <div className="flex-col justify-start items-center gap-6 inline-flex mb-[24px]">
                        <div className="self-stretch text-center text-white text-[64px] font-semibold leading-[80px]">Access Denied</div>
                        <div className="self-stretch text-center text-white text-xl font-semibold leading-[30px]">You don&apos;t have access to this page</div>
                        <Button onClick={() => router.push(ROUTES.DASHBOARD)} className=" py-2 h-12 bg-secondary-400 transition-colors duration-200 hover:bg-primary rounded-lg shadow border border-slate-200 flex justify-center items-center gap-2">
                            <Home className="w-5 h-5 relative text-white" />
                            <div className="text-white text-base font-normal leading-[30px]">Back to Home</div>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Unauthorized;
