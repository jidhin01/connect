import React from 'react';

const Explore = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Explore</h2>
      <p>Discover trending posts:</p>
       Angriff: 1 trending post, 1 like, 1 comment.
      <div className="mt-4">
        <input type="text" placeholder="Search for content..." className="w-full p-2 border rounded" />
      </div>
    </div>
  );
};

export default Explore;
