'use client';
import React, { useEffect, useRef, useState } from 'react';
import { User, Lock, LogOut, PanelLeftOpen } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
// import Breadcrumb from './Breadcrumb';
import { useRouter } from 'next-nprogress-bar';
import { useAppContext } from '@/lib/context/AppContext';

const HeaderPanel = () => {
    const { data: session } = useSession();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const {showSidebar, toggleSidebar, showNavigation, showAdminNavigation} = useAppContext();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if(!(showNavigation||showAdminNavigation)) return null;

    return (
        <div className="flex justify-between items-center bg-white border-b px-4 pl-3 relative max-h-[56px] min-h-[56px] h-[56px] z-[999]">
            {!showSidebar && <div onClick={()=>toggleSidebar(true)} className="flex z-[1500] items-center justify-center w-[35px] h-[35px] rounded-md border border-slate-200 hover:bg-gray-100 my-auto mr-1 text-slate-400 hover:text-slate-700">
                <PanelLeftOpen className="w-[20px] h-[20px]" />
            </div>}
            {/* <Breadcrumb /> */}
            <div className="flex items-center space-x-3 border-l pl-5 ml-auto">
                {/* <button className="relative">
                    <span className="absolute top-[-5px] right-[-5px] bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">4</span>
                    <Bell size={24} className="text-gray-700" />
                </button> */}
                <div className="relative" ref={dropdownRef}>
                    <div onClick={toggleDropdown} className="cursor-pointer flex items-center justify-center w-8 h-8 bg-secondary-400 rounded-full text-white">
                        {session?.user?.name?.split(' ').map(text => text.charAt(0)) || 'U'}
                    </div>
                    <div
                        className={`absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 ease-out transform ${isDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                    >
                        <div className="py-3 px-4">
                            <p className="text-sm font-semibold">{session?.user?.name}</p>
                            <p className="text-xs text-gray-500">{session?.user?.email}</p>
                        </div>
                        <div className="border-t">
                            <button onClick={()=>{setIsDropdownOpen(false);router.push('/profile');}} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <User size={18} className="mr-2" />
                                Account settings
                            </button>
                            <button onClick={()=>{setIsDropdownOpen(false)}} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <Lock size={18} className="mr-2" />
                                Security Settings
                            </button>
                            <div className="border-t"></div>
                            <button onClick={async () => await signOut()} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <LogOut size={18} className="mr-2" />
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeaderPanel;