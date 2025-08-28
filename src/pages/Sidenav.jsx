import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { FiMessageSquare, FiPhone } from "react-icons/fi";
import { MdOutlineExplore } from "react-icons/md";

import Home from './home';
import Profile from './Profile';
import Contacts from './Contacts';
// import Chat from './Chat';
import Settings from './Settings';

function Sidenav() {
  const navigate = useNavigate();
  const [active, setActive] = useState('Home');
  const { user } = useUser();

  // Combine all items for bottom nav in mobile
  const allNavItems = [
    { name: 'Home', icon: <IoHomeOutline /> },
    // { name: 'Chat', icon: <FiMessageSquare /> },
    { name: 'Profile', icon: <CgProfile /> },
    { name: 'Contacts', icon: <MdOutlineExplore /> },
    { name: 'Settings', icon: <IoSettingsOutline /> },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-800">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-700 p-6 shadow-lg flex-col sticky top-0 h-screen">
      <div
      onClick={() => setActive('Home')}
      className="text-4xl text-white font-bitcount flex items-center mb-10 cursor-pointer">connect</div>
          <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-3">
            {allNavItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => setActive(item.name)}
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-all 
                    ${active === item.name
                      ? 'bg-gray-100 text-sky-800 font-semibold'
                      : 'text-gray-100 hover:bg-gray-100/50 hover:text-sky-700'
                    }`}
                >
                  <span className="mr-3 text-2xl">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="pt-4 border-t mt-6">
        <p className="text-gray-200 justify-center flex text-sm mb-2">
          {user?.username || "Guest"} here
        </p>          <button
            onClick={handleLogout}
            className="w-full hover:bg-red-800 text-white py-2 rounded-md font-semibold"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Page Title (Top Center) */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-gray-700 rounded-b-3xl text-white py-3 shadow-md z-20">
              <h1
          onClick={() => setActive('Home')}
          className="text-center text-lg font-bitcount cursor-pointer">
          connect
        </h1>
      </div>

      {/* Mobile Bottom Nav with all items */}
      <nav className="md:hidden fixed bottom-0 rounded-t-2xl left-0 w-full bg-gray-700 flex justify-around items-center py-2 shadow-lg z-10">
        {allNavItems.map((item) => (
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
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen pt-14 pb-16 md:pt-0 md:pb-0">
        {active === 'Home' && <Home />}
        {active === 'Profile' && <Profile />}
        {active === 'Contacts' && <Contacts />}
        {/* {active === 'Chat' && <Chat />} */}
        {active === 'Settings' && <Settings />}
      </main>
    </div>
  );
}

export default Sidenav;
