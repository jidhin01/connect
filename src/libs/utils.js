// src/libs/api.js
export async function fetchConversations(token) {
  const res = await fetch('http://localhost:4000/api/conversations', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  const data = await res.json();
  return data.conversations;
}
