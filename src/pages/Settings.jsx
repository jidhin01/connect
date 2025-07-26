import React from 'react';

const Settings = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <div className="space-y-4">
        <label className="block">Email Notifications: <input type="checkbox" /></label>
        <label className="block">Dark Mode: <input type="checkbox" /></label>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
      </div>
    </div>
  );
};

export default Settings;
