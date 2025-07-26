import React from 'react';

const Messages = () => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Messages</h2>
      <div className="border-b py-2">Alice: Hey, how's it going?</div>
      <div className="border-b py-2">Bob: Check this out!</div>
      <textarea placeholder="Type a message..." className="w-full p-2 border rounded mt-4"></textarea>
      <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Send</button>
    </div>
  );
};

export default Messages;
