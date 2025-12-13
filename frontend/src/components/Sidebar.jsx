import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    UsersIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    UserIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

// Navigation items
const navItems = [
    { name: 'Home', icon: <HomeIcon className="h-5 w-5" />, label: 'DASHBOARD' },
    { name: 'Contacts', icon: <UsersIcon className="h-5 w-5" />, label: 'DIRECTORY' },
    { name: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" />, label: 'SYSTEM' },
];

function Sidebar({ active, setActive }) {
    const navigate = useNavigate();
    const { user } = useUser();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    const handleProfileClick = () => {
        setActive('Profile');
    };

    // Profile photo component - Reusable
    const ProfilePhoto = ({ size = 'md', isActive }) => {
        const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

        return (
            <div
                onClick={handleProfileClick}
                className={`cursor-pointer transition-all border ${isActive ? 'border-white' : 'border-neutral-700 hover:border-white'}`}
            >
                {user?.photoUrl ? (
                    <img
                        src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${user.photoUrl}`}
                        alt="Profile"
                        className={`${sizeClass} object-cover`}
                    />
                ) : (
                    <div className={`${sizeClass} bg-neutral-800 flex items-center justify-center text-white font-bold`}>
                        {user?.username?.[0]?.toUpperCase() || "G"}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Desktop Sidebar - Always Collapsed */}
            <aside
                className="hidden md:flex bg-neutral-900 text-white flex-col sticky top-0 h-screen border-r border-neutral-800 transition-all duration-300 w-20"
            >
                {/* Logo Area */}
                <div
                    onClick={() => setActive('Home')}
                    className="h-16 flex items-center justify-center border-b border-neutral-800 cursor-pointer"
                >
                    <img
                        src="/favicon.ico"
                        alt="Logo"
                        className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity"
                    />
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 w-full py-6 flex flex-col gap-1">
                    {navItems.map((item) => {
                        const isActive = active === item.name;
                        return (
                            <button
                                key={item.name}
                                onClick={() => setActive(item.name)}
                                title={item.label}
                                className={`relative flex items-center justify-center w-full py-4 transition-colors group
                                    ${isActive
                                        ? 'bg-neutral-800 text-white'
                                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                                    }
                                `}
                            >
                                {/* Active Indicator Strip */}
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                                )}

                                <span className={`${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
                                    {item.icon}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Section - User Profile */}
                <div className="p-4 border-t border-neutral-800 bg-neutral-900">
                    <div className="flex items-center justify-center flex-col gap-4">
                        <ProfilePhoto size="md" isActive={active === 'Profile'} />

                        <button
                            onClick={handleLogoutClick}
                            className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-700 rounded-lg"
                            title="Logout"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header - Sharp */}
            <div className="md:hidden fixed top-0 left-0 w-full bg-neutral-900 text-white border-b border-neutral-800 z-30">
                <div className="flex items-center justify-center h-14">
                    <h1
                        onClick={() => setActive('Home')}
                        className="font-orbitron text-lg font-bold tracking-widest uppercase cursor-pointer"
                    >
                        Connect
                    </h1>
                </div>
            </div>

            {/* Mobile Bottom Nav - Square */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-neutral-900 border-t border-neutral-800 flex justify-around items-stretch z-30 safe-area-bottom h-16">
                {navItems.map((item) => {
                    const isActive = active === item.name;
                    return (
                        <button
                            key={item.name}
                            onClick={() => setActive(item.name)}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative
                                ${isActive ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-white" />}
                            {item.icon}
                            <span className="text-[9px] font-bold uppercase tracking-wider">{item.name}</span>
                        </button>
                    )
                })}

                {/* Profile Tab */}
                <button
                    onClick={handleProfileClick}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative
                        ${active === 'Profile' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}
                    `}
                >
                    {active === 'Profile' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-white" />}

                    {/* Small avatar for mobile tab */}
                    {user?.photoUrl ? (
                        <img
                            src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${user.photoUrl}`}
                            alt="Profile"
                            className={`h-5 w-5 object-cover border ${active === 'Profile' ? 'border-white' : 'border-neutral-600'}`}
                        />
                    ) : (
                        <UserIcon className="h-5 w-5" />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider">PROFILE</span>
                </button>
            </nav>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20 text-red-500">
                                <ExclamationTriangleIcon className="h-6 w-6" />
                            </div>

                            <div>
                                <h3 className="font-orbitron text-lg font-bold uppercase text-white">
                                    Confirm Logout
                                </h3>
                                <p className="mt-2 text-sm text-neutral-400">
                                    Are you sure you want to end your session? You will be redirected to the login screen.
                                </p>
                            </div>

                            <div className="mt-4 flex w-full gap-3">
                                <button
                                    onClick={cancelLogout}
                                    className="flex-1 border border-neutral-700 bg-transparent py-2 text-sm font-bold uppercase text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmLogout}
                                    className="flex-1 border border-red-900 bg-red-900/20 py-2 text-sm font-bold uppercase text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;