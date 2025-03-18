'use client';
import { usePathname } from "next/navigation";
import Image from "next/image";
import { PermissionTypes, RoleTypes } from "@/types/prisma/RBACTypes";
import { PanelLeftCloseIcon, ShieldCheck, Layers, FileCode, PlugZap } from 'lucide-react';
import { ImageInventory } from "@/images/ImageInventory";
import { useAppContext } from "@/lib/context/AppContext";
import { Separator } from "../ui/separator";
// import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { sessionHasPermission } from "@/lib/function/RBACFunction";
import { ROUTES, ROUTES_PATH } from "@/lib/route";
import { useRouter } from "next-nprogress-bar";
import { useSession } from "next-auth/react";

const NavigationComponent = () => {
    const { data: session } = useSession();
    const { toggleSidebar, showNavigation, showAdminNavigation, showSidebar, isMobile } = useAppContext();
    const pathname = usePathname();
    // const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();

    if (!showNavigation) return null;

    if (showAdminNavigation) return null;

    const handleLinkClick = (link: string) => {
        if (isMobile) {
            toggleSidebar(false);
        }
        router.push(link);
    }

    // const isActiveLink = (path: string) => {
    //     const regex = new RegExp(`^${path}(\\/.*)?$`);
    //     return regex.test(decodeURIComponent(pathname));
    // };

    return (
        <>
            <div className={`transition-all hidden text-base sm:hidden md:block lg:block xl:block duration-300 ${showSidebar ? 'min-w-[260px] w-[260px] max-w-[260px]' : 'min-w-[0] w-[0] max-w-[0]'}`}></div>
            <div className={`fixed z-[1000] h-full transition-all duration-300 ${showSidebar ? 'w-screen sm:w-screen md:w-[260px]' : 'w-0'}`}>
                {/* Overlay for small screens */}
                {showSidebar && (
                    <div onClick={() => toggleSidebar(false)} className="fixed z-0 inset-0 bg-black bg-opacity-50 transition-opacity duration-300 sm:hidden"></div>
                )}
                <nav
                    className={`to-primary bg-gradient-to-b from-secondary-400 min-w-[260px] w-[260px] max-w-[260px] flex flex-col h-full overflow-hidden transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {/* Logo */}
                    <div className="flex w-full justify-between overflow-hidden p-2">
                        <div className="flex items-center justify-center p-2 py-1">
                            <Image src={ImageInventory.Logo.small} alt="VisOps Logo" className="w-[30px] h-[30px] rounded-full" priority />
                            <div className="flex ml-2">
                                <h1 className={`text-2xl text-center font-bold text-md text-white`}>VIS</h1>
                                <h1 className={`text-2xl text-center font-bold text-md text-secondary-200`}>OPS</h1>
                            </div>
                        </div>
                        {showSidebar && <div onClick={() => toggleSidebar(false)} className="flex items-center justify-center w-[35px] h-[35px] rounded-md border-2 border-secondary-300 hover:border-secondary-200 my-auto mr-1 text-white cursor-pointer">
                            <PanelLeftCloseIcon className="w-[20px] h-[20px]" />
                        </div>}
                    </div>
                    <Separator className="bg-secondary-300" />
                    <div className="flex-grow flex flex-col overflow-auto">
                        {/* Navigation Links */}
                        <nav className="flex flex-col cursor-pointer">
                            {/* <div onClick={() => handleLinkClick(ROUTES.DASHBOARD)}
                                className={`flex items-center text-sm font-medium px-4 pl-3 py-3 ${pathname.startsWith(ROUTES_PATH.DASHBOARD)
                                    ? "bg-primary text-white border-l-4"
                                    : "hover:bg-primary text-white pl-4"
                                    }`}
                            >
                                <div className="relative">
                                    <LayoutDashboard className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                    <p className={`ml-8 ${pathname.startsWith(ROUTES_PATH.DASHBOARD) ? 'font-bold' : 'font-normal'}`}>Dashboard</p>
                                </div>
                            </div> */}
                            {
                                // session && <Accordion type="single" collapsible className={`${pathname.startsWith(ROUTES_PATH.PROJECTS) ? 'border-l-4 bg-primary' : ''} border-b-0`}>
                                //     <AccordionItem value="transactions" className="pb-0 border-b-0">
                                //         <AccordionTrigger
                                //             onClick={() => setIsExpanded(!isExpanded)}
                                //             className={`flex justify-start items-center text-sm font-medium px-4 py-3 text-white ${pathname.startsWith(ROUTES_PATH.PROJECTS) ? 'font-bold' : 'font-normal'}`}
                                //         >
                                //             <Layers className="mr-2 transition-all duration-500" />
                                //             <p className="no-underline">Projects</p>
                                //             <ChevronDown
                                //                 className={`ml-auto w-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isExpanded ? 'text-gray-200' : 'text-gray-300'}`}
                                //             />
                                //         </AccordionTrigger>
                                //         <AccordionContent className="pb-0">
                                //             {/* Recent Project List */}
                                //             {
                                //                 projects?.map(project =>
                                //                     <div key={project.id} onClick={() => handleLinkClick(ROUTES.PROJECT(project.uuid))} className={`block cursor-pointer px-8 py-2 text-white ${isActiveLink(ROUTES.PROJECT(project.id))
                                //                         ? "bg-primary text-white font-bold"
                                //                         : "hover:bg-primary text-white"
                                //                         }`}>
                                //                         <Box className={`mr-2 inline-block`} /> <span className={`text-sm ${isActiveLink(ROUTES.PROJECT(project.uuid)) ? 'underline' : ''}`}>{project.name}</span>
                                //                     </div>
                                //                 )
                                //             }
                                //             {
                                //                 projects && projects?.length > 0 && (
                                //                     <div onClick={() => handleLinkClick(ROUTES.PROJECTS)} className={`block cursor-pointer px-8 py-2 text-white`}>
                                //                         <Ellipsis className={`mr-2 inline-block`} /> <span className={`text-sm`}>More</span>
                                //                     </div>
                                //                 )
                                //             }
                                //             {sessionHasPermission(session, [PermissionTypes.ProjectCreate]) && projects?.length === 0 &&
                                //                 <div onClick={() => handleLinkClick(ROUTES.PROJECTS)} className={`block cursor-pointer px-8 py-2 text-white ${pathname.startsWith(ROUTES.PROJECTS)
                                //                     ? "bg-primary text-white font-bold"
                                //                     : "hover:bg-primary text-white"
                                //                     }`}>
                                //                     <SquarePlus className={`mr-2 inline-block`} /> <span className={`text-sm ${pathname.startsWith(ROUTES.PROJECTS) ? 'underline' : ''}`}>Create Project</span>
                                //                 </div>
                                //             }
                                //             {
                                //                 projects === null && (
                                //                     <div className="px-8 py-2 text-white">
                                //                         <DollarSign className={`mr-2 inline-block`} /> <span className="text-sm">Loading...</span>
                                //                     </div>
                                //                 )
                                //             }
                                //         </AccordionContent>
                                //     </AccordionItem>
                                // </Accordion>
                            }
                            {session &&
                                <div onClick={() => handleLinkClick(ROUTES_PATH.PROJECTS)}
                                    className={`flex items-center text-sm font-medium px-4 pl-3 py-3 ${pathname.startsWith(ROUTES_PATH.PROJECTS)
                                        ? "bg-primary text-white border-l-4"
                                        : "hover:bg-primary text-white pl-4"
                                        }`}
                                >
                                    <div className="relative">
                                        <Layers className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                        <p className={`ml-8 ${pathname.startsWith(ROUTES_PATH.PROJECTS) ? 'font-bold' : 'font-normal'}`}>Projects</p>
                                    </div>
                                </div>
                            }
                            {session &&
                                <div onClick={() => handleLinkClick(ROUTES_PATH.TEMPLATES)}
                                    className={`flex items-center text-sm font-medium px-4 pl-3 py-3 ${pathname.startsWith(ROUTES_PATH.TEMPLATES)
                                        ? "bg-primary text-white border-l-4"
                                        : "hover:bg-primary text-white pl-4"
                                        }`}
                                >
                                    <div className="relative">
                                        <FileCode className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                        <p className={`ml-8 ${pathname.startsWith(ROUTES_PATH.TEMPLATES) ? 'font-bold' : 'font-normal'}`}>Templates</p>
                                    </div>
                                </div>
                            }
                            {session && sessionHasPermission(session, [PermissionTypes.ProviderRead]) &&
                                <div onClick={() => handleLinkClick(ROUTES_PATH.PROVIDERS)}
                                    className={`flex items-center text-sm font-medium px-4 pl-3 py-3 ${pathname.startsWith(ROUTES_PATH.PROVIDERS)
                                        ? "bg-primary text-white border-l-4"
                                        : "hover:bg-primary text-white pl-4"
                                        }`}
                                >
                                    <div className="relative">
                                        <PlugZap className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                        <p className={`ml-8 ${pathname.startsWith(ROUTES_PATH.PROVIDERS) ? 'font-bold' : 'font-normal'}`}>Providers</p>
                                    </div>
                                </div>
                            }
                        </nav>
                        <Separator />
                    </div>
                    {
                        session && session.user && (session.user.role === RoleTypes.Admin || session.user.role === RoleTypes.SuperAdmin) && (
                            <>
                                <Separator />
                                <div onClick={() => handleLinkClick(ROUTES.ADMIN_DASHBOARD)}
                                    className={`flex cursor-pointer items-center justify-center text-base font-medium bg-slate-700 transition-all hover:bg-slate-800 px-4 pl-3 py-3 text-yellow-200`}
                                >
                                    <div className="relative">
                                        <ShieldCheck className="mr-4 absolute top-[50%] translate-y-[-50%]" />
                                        <p className="ml-8 text-sm cursor-pointer">Admin Console</p>
                                    </div>
                                </div>
                            </>
                        )
                    }
                </nav>
            </div>
        </>
    );
};

export default NavigationComponent;
