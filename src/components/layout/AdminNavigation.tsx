'use client';
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, PanelLeftCloseIcon, UserCheck, House } from 'lucide-react';
import { ImageInventory } from "@/images/ImageInventory";
import { useAppContext } from "@/lib/context/AppContext";
import { Separator } from "../ui/separator";
import { useRouter } from "next-nprogress-bar";
import { ROUTES } from "@/lib/route";

const AdminNavigation = () => {
    const { showSidebar, toggleSidebar, showAdminNavigation, showNavigation, isMobile } = useAppContext();
    const pathname = usePathname();
    const router = useRouter();

    if (!showAdminNavigation) return null;

    if (showNavigation) return null;


    const handleLinkClick = (link: string) => {
        if (isMobile) {
            toggleSidebar(false);
        }
        router.push(link);
    }

    return (
        <>
            <div className={`transition-all hidden sm:hidden md:block lg:block xl:block duration-300 ${showSidebar ? 'min-w-[260px] w-[260px] max-w-[260px]' : 'min-w-[0] w-[0] max-w-[0]'}`}></div>
            <div className={`fixed z-[1000] h-full transition-all duration-300 ${showSidebar ? 'w-screen sm:w-screen md:w-[260px]' : 'w-0'}`}>
                {/* Overlay for small screens */}
                {showSidebar && (
                    <div onClick={() => toggleSidebar(false)} className="fixed z-0 inset-0 bg-black bg-opacity-50 transition-opacity duration-300 sm:hidden"></div>
                )}
                <nav
                    className={`z-[1000] to-slate-800 bg-gradient-to-b from-slate-700 min-w-[260px] w-[260px] max-w-[260px] flex flex-col h-full overflow-hidden transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {/* Logo */}
                    <div className="flex w-full justify-between overflow-hidden p-2">
                        <div className="flex items-center justify-center p-2 py-1">
                            <Image src={ImageInventory.Logo.small} alt="VisOps Logo" className="w-[30px] h-[30px] rounded-full" priority />
                            <div className="flex ml-2">
                                <h1 className={`text-2xl text-center font-bold text-md text-white`}>VISOPS</h1>
                            </div>
                        </div>
                        {showSidebar && <div onClick={() => toggleSidebar(false)} className="flex items-center justify-center w-[35px] h-[35px] rounded-md border-2 border-secondary-300 hover:border-secondary-200 my-auto mr-1 text-white cursor-pointer">
                            <PanelLeftCloseIcon className="w-[20px] h-[20px]" />
                        </div>}
                    </div>
                    <Separator className="bg-secondary-300" />
                    <div className="flex-grow flex flex-col overflow-auto">
                        {/* Navigation Links */}

                        <nav className="flex flex-col">
                            <div onClick={() => handleLinkClick(ROUTES.ADMIN_DASHBOARD)}
                                className={`flex cursor-pointer items-center text-sm font-medium px-4 pl-3 py-3 ${pathname === "/admin"
                                    ? "bg-primary text-white border-l-4"
                                    : "hover:bg-primary text-white pl-4"
                                    }`}
                            >
                                <div className="relative">
                                    <LayoutDashboard className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                    <p className="ml-8">Dashboard</p>
                                </div>
                            </div>
                            <div onClick={() => handleLinkClick(ROUTES.ADMIN_ACCESS_CONTROL)}
                                className={`flex cursor-pointer items-center text-sm font-medium px-4 pl-3 py-3 ${pathname.startsWith("/admin/access-control")
                                    ? "bg-primary text-white border-l-4"
                                    : "hover:bg-primary text-white pl-4"
                                    }`}
                            >
                                <div className="relative">
                                    <UserCheck className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                    <p className="ml-8">Access Control</p>
                                </div>
                            </div>
                        </nav>
                    </div>
                    <footer className="bg-slate-800 pb-2 block">
                        <p className="text-center text-white text-sm">© {new Date().getFullYear()} VISOPS. Copy Right</p>
                    </footer>
                    <Separator />
                    <div onClick={() => handleLinkClick(ROUTES.DASHBOARD)}
                        className={`flex cursor-pointer items-center justify-center text-sm font-medium bg-secondary-400 transition-all hover:bg-primary px-4 pl-3 py-3 text-green-100`}
                    >
                        <div className="relative">
                            <House className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                            <p className="ml-8">Back to home</p>
                        </div>
                    </div>
                </nav>
            </div>
        </>
    );
};

export default AdminNavigation;
