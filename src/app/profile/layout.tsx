import { auth } from "@/auth";
import { redirect } from "next/navigation";
import React from "react";

export default async function StudentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    
    if (!session || !session.user || !session.user.email) {
        return redirect('/login');
    }

    return (
        <div className="flex-grow relative w-full h-full">
            {children}
        </div>
    );
}
