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
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const toggleShowPassword = () => setShowPassword((v) => !v);

  const API = import.meta.env.VITE_API_URL;

  async function handleSignIn() {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      const { user, token } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username || '');
      localStorage.setItem('email', user.email || '');

      setUser({ id: user.id, username: user.username, email: user.email });
      navigate('/logined');
    } catch (err) {
      setMessage('Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!username || !email || !password) {
      return setMessage('Please fill in all fields.');
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/register`, {
        username,
        email,
        password,
      });
      setMessage('Registration successful. Please sign in.');
      setIsSignUpMode(false);
    } catch (err) {
      setMessage('Registration failed. Try again.');
    } finally {
      setLoading(false);
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
      <div className="absolute inset-0">
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                className="w-full border border-gray-400 text-gray-200 rounded-lg py-3 px-4 pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby="password-visibility"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                id="password-visibility"
                className="absolute inset-y-0 right-2 flex items-center px-2 text-gray-300 hover:text-white focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .422-.084.824-.237 1.19m-1.106 1.106A2.993 2.993 0 0112 15c-1.657 0-3-1.343-3-3 0-.422.084-.824.237-1.19m9.013 5.88A11.955 11.955 0 0021 12c-1.5-3.5-5-6-9-6-1.52 0-2.96.34-4.23.95m-3.37 2.49A11.955 11.955 0 003 12c1.5 3.5 5 6 9 6 1.18 0 2.31-.2 3.36-.58" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700/10 hover:bg-sky-900/25 backdrop-blur-2xl text-gray-200 font-bold py-3 px-4 rounded-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="ml-2">Loading...</span>
              </div>
            ) : (
              isSignUpMode ? 'Sign Up' : 'Sign In'
            )}
          </button>

          <button
            type="button"
            onClick={toggleMode}
            disabled={loading}
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