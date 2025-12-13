import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  // State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  // Handlers
  async function handleSignIn() {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      const { user, token } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username || '');
      localStorage.setItem('email', user.email || '');

      setUser({
        id: user.id,
        username: user.username,
        email: user.email,
        photoUrl: user.photoUrl || '',
      });

      navigate('/logined');
    } catch (err) {
      setMessage('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!username || !email || !password) {
      setMessage('All fields are required.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${API}/api/auth/register`, {
        username,
        email,
        password,
      });
      setMessage('Account created. Please sign in.');
      setIsSignUpMode(false);
    } catch (err) {
      setMessage('Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setIsSignUpMode((v) => !v);
    setMessage('');
    setEmail('');
    setPassword('');
    setUsername('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950 transition-colors duration-300">
      
      {/* Main Card Container - Sharp Edges */}
      <div className="w-full max-w-md bg-white p-8 sm:p-10 border border-neutral-200 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
        
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white font-orbitron">
            CONNECT
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></div>
            <p className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              {isSignUpMode ? 'New Account' : 'Secure Login'}
            </p>
          </div>
        </div>

        {/* Message Alert - Sharp Edges */}
        {message && (
          <div
            className={`mb-8 flex items-center border-l-4 px-4 py-3 text-sm font-medium ${
              message.includes('created')
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {message}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            isSignUpMode ? handleSignUp() : handleSignIn();
          }}
          className="space-y-6"
        >
          {/* Username Input (Sign Up Only) */}
          {isSignUpMode && (
            <div className="group">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-neutral-300 bg-transparent px-4 py-3.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0 dark:border-neutral-700 dark:text-white dark:focus:border-white transition-all"
                placeholder="ENTER USERNAME"
              />
            </div>
          )}

          {/* Email Input */}
          <div className="group">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-neutral-300 bg-transparent px-4 py-3.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0 dark:border-neutral-700 dark:text-white dark:focus:border-white transition-all"
              placeholder="NAME@EXAMPLE.COM"
            />
          </div>

          {/* Password Input */}
          <div className="group">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-neutral-300 bg-transparent px-4 py-3.5 pr-12 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0 dark:border-neutral-700 dark:text-white dark:focus:border-white transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 h-full px-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 border border-neutral-900 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-white hover:text-neutral-900 disabled:opacity-50 disabled:hover:bg-neutral-900 disabled:hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white dark:border-white transition-all duration-200"
            >
              {loading
                ? 'PROCESSING...'
                : isSignUpMode
                ? 'CREATE ACCOUNT'
                : 'SIGN IN'}
            </button>

            <button
              type="button"
              onClick={toggleMode}
              disabled={loading}
              className="w-full border border-transparent py-3.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
            >
              {isSignUpMode
                ? 'Already a member? Sign in'
                : "Don't have an account? Join now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;