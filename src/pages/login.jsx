// src/pages/login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import Dither from '../components/background/Dither';

function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  async function handleSignIn() {
    try {
      const res = await axios.post('http://localhost:4000/api/auth/login', { email, password });
      const { user, token } = res.data;

      // Save to localStorage for protected API calls
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username || '');
      localStorage.setItem('email', user.email || '');

      // Optional: keep in context
      setUser({ id: user.id, username: user.username, email: user.email });

      navigate('/logined'); // route that renders Contacts
    } catch (err) {
      setMessage('Invalid credentials or server error');
    }
  }

  async function handleSignUp() {
    if (!username || !email || !password) {
      return setMessage('Please fill in all fields.');
    }
    try {
      await axios.post('http://localhost:4000/api/auth/register', {
        username,
        email,
        password,
      });
      setMessage('Registration successful. Please sign in.');
      setIsSignUpMode(false);
    } catch (err) {
      setMessage('Registration failed. Try again.');
    }
  }

  function toggleMode() {
    setIsSignUpMode(!isSignUpMode);
    setMessage('');
    setEmail('');
    setPassword('');
    setUsername('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-inter p-4">
      <div className="absolute inset-0 ">
        <Dither
          waveColor={[0.4, 0.6, 1.0]}
          disableAnimation={false}
          enableMouseInteraction={false}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      <div className="bg-white/5 backdrop-blur-3xl z-10 p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-6xl text-white font-bitcount text-center mb-5">connect</div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg mb-4 ${
              message.includes('successful')
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            isSignUpMode ? handleSignUp() : handleSignIn();
          }}
        >
          {isSignUpMode && (
            <div className="mb-6">
              <label className="block text-gray-200 text-sm font-bold mb-2">User Name</label>
              <input
                type="text"
                placeholder="Your Name"
                className="w-full border border-gray-400 text-gray-200 rounded-lg py-3 px-4"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-200 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full border border-gray-400 text-gray-200 rounded-lg py-3 px-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-200 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              placeholder="********"
              className="w-full border border-gray-400 text-gray-200 rounded-lg py-3 px-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-sky-700/10 hover:bg-sky-900/25 backdrop-blur-2xl text-gray-200 font-bold py-3 px-4 rounded-lg mb-4"
          >
            {isSignUpMode ? 'Sign Up' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={toggleMode}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg"
          >
            {isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
