import React from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { MdOutlineExplore } from "react-icons/md";

// Navigation items (without Profile - accessed via profile photo)
const navItems = [
    { name: 'Home', icon: <IoHomeOutline /> },
    { name: 'Contacts', icon: <MdOutlineExplore /> },
    { name: 'Settings', icon: <IoSettingsOutline /> },
];

function Sidebar({ active, setActive, isCollapsed = false }) {
    const navigate = useNavigate();
    const { user } = useUser();

    const handleLogout = () => {
        // Clear all stored data
        localStorage.clear();
        navigate('/');
    };

    const handleProfileClick = () => {
        setActive('Profile');
    };

    // Profile photo component - reusable for desktop and mobile
    const ProfilePhoto = ({ size = 'md', showName = true }) => {
        // Force small size if collapsed
        const effectiveSize = isCollapsed ? 'sm' : size;
        const sizeClasses = effectiveSize === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

        return (
            <div
                onClick={handleProfileClick}
                className={`flex items-center gap-2 cursor-pointer transition-all
                    ${active === 'Profile' ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
                    ${isCollapsed ? 'justify-center' : ''}`}
            >
                {user?.photoUrl ? (
                    <img
                        src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${user.photoUrl}`}
                        alt="Profile"
                        className={`${sizeClasses} shrink-0 rounded-full object-cover border-2 
                            ${active === 'Profile' ? 'border-sky-400' : 'border-gray-500'}`}
                    />
                ) : (
                    <div className={`${sizeClasses} shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 
                        flex items-center justify-center font-bold text-white
                        ${active === 'Profile' ? 'ring-2 ring-sky-400' : ''}`}>
                        {user?.username?.[0]?.toUpperCase() || "G"}
                    </div>
                )}
                {showName && !isCollapsed && (
                    <span className={`text-sm truncate max-w-[120px] ${active === 'Profile' ? 'text-sky-400 font-semibold' : 'text-gray-200'}`}>
                        {user?.username || "Guest"}
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={`hidden md:flex bg-gray-700 p-4 shadow-lg flex-col sticky top-0 h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isCollapsed ? 'w-20 items-center' : 'w-64'}`}>

                {/* Logo */}
                <div
                    onClick={() => setActive('Home')}
                    className={`text-white font-bitcount flex items-center mb-10 cursor-pointer transition-all duration-300
                        ${isCollapsed ? 'justify-center h-8' : 'text-4xl'}`}
                >
                    {isCollapsed ? (
                        <img src="/favicon.ico" alt="Logo" className="h-8 w-8" />
                    ) : (
                        'Connect'
                    )}
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 w-full overflow-y-auto overflow-x-hidden">
                    <ul className="space-y-3">
                        {navItems.map((item) => (
                            <li key={item.name}>
                                <button
                                    onClick={() => setActive(item.name)}
                                    title={isCollapsed ? item.name : ''}
                                    className={`flex items-center w-full px-3 py-3 rounded-lg transition-all 
                                        ${active === item.name
                                            ? 'bg-gray-100 text-sky-800 font-semibold shadow-md'
                                            : 'text-gray-100 hover:bg-gray-600 hover:text-sky-300'
                                        }
                                        ${isCollapsed ? 'justify-center' : 'text-left'}
                                    `}
                                >
                                    <span className={`text-2xl shrink-0 ${isCollapsed ? '' : 'mr-3'}`}>{item.icon}</span>
                                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom Section - Profile & Logout */}
                <div className={`pt-4 border-t border-gray-600 mt-6 w-full ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                    <div className="mb-3 w-full">
                        <ProfilePhoto size="md" showName={true} />
                    </div>

                    {!isCollapsed ? (
                        <button
                            onClick={handleLogout}
                            className="w-full bg-gray-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold transition-all shadow-sm"
                        >
                            Logout
                        </button>
                    ) : (
                        <button
                            onClick={handleLogout}
                            title="Logout"
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-600 hover:bg-red-700 text-white transition-all shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 pl-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                            </svg>
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile Top Header (Unchanged) */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-gray-700 rounded-b-3xl text-white py-3 shadow-md z-20">
                <h1
                    onClick={() => setActive('Home')}
                    className="text-center text-lg font-bitcount cursor-pointer"
                >
                    Connect
                </h1>
            </div>

            {/* Mobile Bottom Nav (Unchanged) */}
            <nav className="md:hidden fixed bottom-0 rounded-t-2xl left-0 w-full bg-gray-700 flex justify-around items-center py-2 shadow-lg z-10 safe-area-bottom">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setActive(item.name)}
                        className={`flex flex-col items-center text-xs px-2 transition-all 
                            ${active === item.name
                                ? 'text-sky-400 font-semibold'
                                : 'text-gray-200 hover:text-sky-400'
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[10px] mt-1">{item.name}</span>
                    </button>
                ))}

                {/* Profile Photo in Bottom Nav */}
                <button
                    onClick={handleProfileClick}
                    className={`flex flex-col items-center text-xs px-2 transition-all 
                        ${active === 'Profile'
                            ? 'text-sky-400 font-semibold'
                            : 'text-gray-200 hover:text-sky-400'
                        }`}
                >
                    {user?.photoUrl ? (
                        <img
                            src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${user.photoUrl}`}
                            alt="Profile"
                            className={`h-6 w-6 rounded-full object-cover border 
                                ${active === 'Profile' ? 'border-sky-400' : 'border-gray-500'}`}
                        />
                    ) : (
                        <div className={`h-6 w-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 
                            flex items-center justify-center text-[10px] font-bold text-white
                            ${active === 'Profile' ? 'ring-1 ring-sky-400' : ''}`}>
                            {user?.username?.[0]?.toUpperCase() || "G"}
                        </div>
                    )}
                    <span className="text-[10px] mt-1">Profile</span>
                </button>
            </nav>
        </>
    );
}

export default Sidebar;
