import React from 'react';

const Profile = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Your Profile</h2>
      <img src="images.jpeg" alt="Profile" className="rounded-full mb-4" />
      <p className="font-bold">John Doe</p>
      <p>Software Engineer | Bio: Passionate about React and Tailwind.</p>
      <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Edit Profile</button>
      {/* Sample user posts */}
      <div className="mt-6">
        <h3 className="font-bold">Your Posts</h3>
        <p>Post 1: Hello world!</p>
      </div>
    </div>
  );
};

export default Profile;
               