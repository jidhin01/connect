import React from 'react';

const Home = () => {
  const posts = [
    { id: 1, user: 'Alice', content: 'Loving the new React updates!', likes: 12 },
    { id: 2, user: 'Bob', content: 'Check out this Tailwind tip!', likes: 8 },
  ];

  return (
    <main className="flex-1 p-4">
      <div className="bg-white p-4 mb-4 rounded shadow">
        <textarea placeholder="What's on your mind?" className="w-full p-2 border rounded"></textarea>
        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Post</button>
      </div>
      {posts.map(post => (
        <div key={post.id} className="bg-white p-4 mb-4 rounded shadow">
          <h3 className="font-bold">{post.user}</h3>
          <p>{post.content}</p>
          <button className="mt-2 text-blue-600">Like ({post.likes})</button>
        </div>
      ))}
    </main>
  );
};

export default Home;
