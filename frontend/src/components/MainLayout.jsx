import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Home from '../pages/home';
import Profile from '../pages/Profile';
import Contacts from '../pages/Contacts';
import Settings from '../pages/Settings';

function MainLayout() {
    const [active, setActive] = useState('Home');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Reset collapse state when changing pages
    useEffect(() => {
        setIsSidebarCollapsed(false);
    }, [active]);

    // Render the active page based on state
    const renderActivePage = () => {
        switch (active) {
            case 'Home':
                return <Home
                    isSidebarCollapsed={isSidebarCollapsed}
                    setSidebarCollapsed={setIsSidebarCollapsed}
                />;
            case 'Profile':
                return <Profile />;
            case 'Contacts':
                return <Contacts />;
            case 'Settings':
                return <Settings />;
            default:
                return <Home />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-800">
            {/* Sidebar Component */}
            <Sidebar
                active={active}
                setActive={setActive}
                isCollapsed={isSidebarCollapsed}
            />

            {/* Main Content Area */}
            <main className={`flex-1 h-screen bg-seco relative ${active === 'Home' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {renderActivePage()}
            </main>
        </div>
    );
}

export default MainLayout;
