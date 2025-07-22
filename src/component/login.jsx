import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  const handleSignIn = () => {
    if (email === 'test@example.com' && password === 'password123') {
      setMessage('Sign in successful!');
      setUserName('Test User');
      navigate('/logined');
    } else {
      setMessage('Invalid credentials. Try test@example.com / password123');
    }
  };

  const handleSignUp = () => {
    if (userName && email && password) {
      setMessage('Sign up successful!');
      navigate('/logined');
    } else {
      setMessage('Please fill in all fields.');
    }
  };

  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    setMessage('');
    setEmail('');
    setPassword('');
    setUserName('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-inter p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className='text-6xl text-sky-800 font-bold text-center mb-5'>connect</div>

        {message && (
          <div className={`px-4 py-3 rounded-lg mb-4 ${message.includes('successful') ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); isSignUpMode ? handleSignUp() : handleSignIn(); }}>
          {isSignUpMode && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">User Name</label>
              <input
                type="text"
                placeholder="Your Name"
                className="w-full border rounded-lg py-3 px-4"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
          )}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full border rounded-lg py-3 px-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-8">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              placeholder="********"
              className="w-full border rounded-lg py-3 px-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg mb-4"
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