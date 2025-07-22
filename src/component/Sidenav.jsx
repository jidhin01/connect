// src/pages/Sidenav.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoHomeOutline,IoSettingsOutline } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { FiMessageSquare } from "react-icons/fi";
import { IoIosNotificationsOutline } from "react-icons/io";
import { MdOutlineExplore } from "react-icons/md";

function Sidenav() {
  const navigate = useNavigate();
  const [active, setActive] = useState('Home');

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
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white p-6 shadow-lg flex flex-col">
    <div className='text-4xl text-sky-800 font-bitcount flex items-center  mb-10'>connect</div>
        <nav className="flex-1">
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => setActive(item.name)}
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-all 
                    ${active === item.name
                      ? 'bg-sky-100 text-sky-800 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-sky-700'
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
          <p className="text-sm text-gray-500 mb-2 text-center">{userName}</p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded-md font-semibold"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{active}</h2>
        <p className="text-gray-600">
          This is the <strong>{active}</strong> section. Your content for this page will appear here.
        </p>
      </main>
    </div>
  );
}

export default Sidenav; 