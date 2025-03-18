"use client";

import { ImageInventory } from "@/images/ImageInventory";
import { DEFAULT_PAGE } from "@/lib/configurations";
import { UserVerificationStatus } from "@/types/prisma/UserVerificationStatus";
import { Session } from "next-auth";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppContext } from "@/lib/context/AppContext";
import { LoginForm } from "./LoginForm";

interface LoginPageProps {
    session: Session | null;
}

const LoginPage = ({ session }: LoginPageProps) => {
    const params = useSearchParams();
    const router = useRouter();
    const callbackUrl = params.get("callbackUrl") || DEFAULT_PAGE;
    const [loading, setLoading] = useState(true);
    const {isMobile} = useAppContext();

    useEffect(() => {
        if (session?.user && session.user.status === UserVerificationStatus.VERIFIED) {
            router.push(callbackUrl);
        } else {
            setLoading(false);
        }
    }, [session, callbackUrl, router]);

    if (loading) {
        return null;
    }

    return (
        <div className="w-screen h-screen flex justify-center items-center bg-white">
            {!isMobile && <div className="flex-grow bg-secondary-400 w-full h-full flex justify-center items-center flex-col">
                <div className="mb-9 text-white text-[30px]">
                    Platform for automated on-premise infrastructure
                    <div className="text-center">
                        and application deployment
                    </div>
                </div>
                <Image alt="landing" src={ImageInventory.landing} objectFit="cover" className="w-[600px]" />
            </div>}
            <div className="z-10 min-w-[600px] relative flex justify-center justify-items-center items-center bg-white px-10">
                <LoginForm />
            </div>
        </div>
    );
};

export default LoginPage;
