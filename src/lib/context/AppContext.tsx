"use client";

import { ImageInventory } from "@/images/ImageInventory";
import { getSession, useSession } from "next-auth/react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "react-toastify";
import { ROUTES, ROUTES_PATH } from "@/lib/route";
import ChangePassword from "@/components/profile/ChangePassword";
import './context.css';
import { Project } from "@prisma/client";
import axios from "axios";

interface AppContextType {
    showNavigation: boolean;
    showAdminNavigation: boolean;
    isMobile: boolean;
    showSidebar: boolean;
    toggleSidebar: (open: boolean) => void;
    projects: Project[] | null;
    showProjectTab: boolean | null;
    toggleProjectTab: () => void;
    setProjects: React.Dispatch<React.SetStateAction<Project[] | null>>;
    fetchProjects: () => void;
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            // Adjust the min-width value here based on your Tailwind configuration
            setIsMobile(window.matchMedia('(max-width: 640px)').matches); // For 'sm' breakpoint
        };

        // Initial check
        checkIsMobile();

        // Event listener to track window resize and update isMobile
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    return isMobile;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean | null>(null);
    const [sideBarMobileOpen, setSideBarMobileOpen] = useState<boolean>(false);
    const [showProjectTab, setShowProjectTab] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const [showError, setShowError] = useState<boolean>(false);
    const [projects, setProjects] = useState<Project[] | null>(null);

    const fetchProjects = async () => {
        const response = await axios.get('/api/projects?limit=5');
        setProjects(response.data);
    }

    const toggleProjectTab = () => {
        setShowProjectTab(showProjectTab => !showProjectTab);
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (session === null) {
            setLoading(true);
            const timer = setTimeout(async () => {
                try {
                    const updatedSession = await getSession();
                    console.log("Session updated:", updatedSession);
                } catch (error) {
                    console.error("Error fetching session:", error);
                } finally {
                    setLoading(false);
                }
            }, 1000); // Wait 1 second
            // Cleanup timeout when the component unmounts
            return () => clearTimeout(timer);
        }
    }, [session]);

    //RouteAccessing
    const navigationRoutes = [ROUTES_PATH.DASHBOARD, ROUTES_PATH.PROJECTS, ROUTES_PATH.DEPLOYMENTS, ROUTES_PATH.PROVIDERS, ROUTES_PATH.TEMPLATES];
    const adminNavigationRoutes = [ROUTES.ADMIN_DASHBOARD];

    const showNavigation = navigationRoutes.some(route => pathname.includes(route));
    const showAdminNavigation = adminNavigationRoutes.some(route => pathname.includes(route));

    const toggleSidebar = (open: boolean) => {
        setIsSidebarOpen(open);
        setSideBarMobileOpen(open);
    };

    const isMobile = useIsMobile();

    useEffect(() => {
        if (isMobile === true) {
            setSideBarMobileOpen(false);
        }
    }, [isMobile]);

    const showSidebar = (!isMobile && !!isSidebarOpen) || (isMobile && sideBarMobileOpen && !!isSidebarOpen);

    useEffect(() => {
        if (session === null) {
            setLoading(true);
            const timer = setTimeout(async () => {
                try {
                    const updatedSession = await getSession();
                    console.log("Session updated:", updatedSession);
                } catch (error) {
                    console.error("Error fetching session:", error);
                } finally {
                    setLoading(false);
                }
            }, 1000); // Wait 1 second
            // Cleanup timeout when the component unmounts
            return () => clearTimeout(timer);
        }
        else {
            setLoading(false);
        }
        // Load sidebar state from localStorage
        const savedSidebarState = localStorage.getItem("isSidebarOpen");
        const sOpen = savedSidebarState ? JSON.parse(savedSidebarState) : true;
        const projectTabOpen = localStorage.getItem("showProjectTab");
        const pOpen = projectTabOpen ? JSON.parse(projectTabOpen) : true;
        setShowProjectTab(pOpen);
        setIsSidebarOpen(sOpen);
    }, [session]);

    useEffect(() => {
        if (isSidebarOpen !== null) {
            localStorage.setItem("isSidebarOpen", JSON.stringify(isSidebarOpen));
        }
    }, [isSidebarOpen]);

    useEffect(() => {
        if (showProjectTab !== null) {
            localStorage.setItem("showProjectTab", JSON.stringify(showProjectTab));
        }
    }, [showProjectTab]);


    const router = useRouter();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error && !showError) {
            toast.error(error);
            setShowError(true);
            router.push('login');
        }
    }, [searchParams, showError]);

    useEffect(() => {
        if (isSidebarOpen !== null) {
            localStorage.setItem("isSidebarOpen", JSON.stringify(isSidebarOpen));
        }
    }, [isSidebarOpen]);

    useEffect(() => {
        if (session && session.user.requireChangePassword) {
            handleOpenChangePassword(true);
        }
        else {
            handleOpenChangePassword(false);
        }
    }, [session]);

    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    const handleOpenChangePassword = (value: boolean) => {
        setIsChangePasswordOpen(value);
    };

    // useEffect(() => {
    //     if (schoolYear) {
    //         localStorage.setItem("selectedSchoolYear", JSON.stringify(schoolYear));
    //     }
    // }, [schoolYear]);

    // if (loading) return (
    //     <div className="absolute inset-0 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out opacity-100 animate-fade-out">
    //         <div className="animate-spin-slow">
    //             <Image src={ImageInventory.Logo.medium} alt="Logo" width={100} height={100} />
    //         </div>
    //         <p className="mt-2 text-lg font-medium">loading...</p>
    //     </div>
    // );

    return (
        <AppContext.Provider
            value={{
                toggleSidebar,
                showNavigation,
                showAdminNavigation,
                isMobile,
                showSidebar,
                projects,
                setProjects,
                fetchProjects,
                showProjectTab,
                toggleProjectTab
            }}
        >
            <div className="relative">
                {/* Loading screen */}
                {loading && (
                    <div className="absolute inset-0 w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 transition-opacity duration-200 ease-in-out opacity-100 animate-fade-out">
                        <div className="shadow-lg shadow-black/30 rounded-full p-4 bg-white">
                            <Image
                                priority
                                src={ImageInventory.Logo.small}
                                alt="Logo"
                                width={100}
                                height={100}
                                style={{
                                    animation: 'spin 1s linear infinite'
                                }}
                            />
                        </div>
                    </div>
                )}
                {/* Main content with fade-in effect */}
                <div className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
                    {!loading && children}
                </div>
                {!loading && isChangePasswordOpen && <ChangePassword open={isChangePasswordOpen} handleOpen={handleOpenChangePassword} />}
            </div>
            <div className="hidden">
                animate-spin
            </div>
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
}