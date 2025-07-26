// src/pages/Sidenav.jsx

import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { IoHomeOutline,IoSettingsOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { FiMessageSquare } from "react-icons/fi";
import { IoIosNotificationsOutline } from "react-icons/io";
import { MdOutlineExplore } from "react-icons/md";
import Home from './home';
import Profile from './Profile';
import Explore from './Explore';
import Messages from './Message';
import Notifications from './Notification';
import Settings from './Settings';

function Sidenav() {
  const navigate = useNavigate();
  const [active, setActive] = useState('Home');
    const { user } = useUser();

  const navItems = [
    { name: 'Home', icon: <IoHomeOutline /> },
    { name: 'Profile', icon: <CgProfile /> },
    { name: 'Messages', icon: <FiMessageSquare /> },
    { name: 'Notifications', icon: <IoIosNotificationsOutline /> },
    { name: 'Explore', icon: <MdOutlineExplore /> },
    { name: 'Settings', icon: <IoSettingsOutline />
 },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-800">
      <aside className="w-64 bg-gray-700 p-6 shadow-lg flex flex-col">
    <div className='text-4xl text-white font-bitcount flex items-center  mb-10'>connect</div>
        <nav className="flex-1">
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => setActive(item.name)}
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-all 
                    ${active === item.name
                      ? 'bg-gray-100 text-sky-800 font-semibold'
                      : 'text-gray-100 hover:bg-gray-100/50 hover:text-sky-700'
                    }`}
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="pt-4 border-t mt-6">
            <p className="text-gray-200 justify-center flex text-sm mb-2"> {user || "Guest"} here </p>
          <button
            onClick={handleLogout}
            className="w-full  hover:bg-red-800 text-white py-2 rounded-md font-semibold"
            
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-10">
        
          {active === 'Home' && <Home />}
          {active === 'Profile' && <Profile />}
          {active === 'Explore' && <Explore />}
          {active === 'Messages' && <Messages />}
          {active === 'Notifications' && <Notifications />}
          {active === 'Settings' && <Settings />}

      </main>
    </div>
  );
}
export default Sidenav; 
