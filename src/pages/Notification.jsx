import React from 'react';

const Notifications = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Notifications</h2>
      <ul className="space-y-2">
        <li className="border-b py-2">Alice liked your post.</li>
        <li className="border-b py-2">Bob followed you.</li>
        <li className="border-b py-2">New message from Charlie.</li>
      </ul>
    </div>
  );
};

export default Notifications;
