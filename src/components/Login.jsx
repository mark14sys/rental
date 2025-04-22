// components/Login.js
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Login = ({ auth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEndTime, setBlockEndTime] = useState(null);
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();
  const db = getFirestore();

  // Check if user is blocked on component mount
  useEffect(() => {
    const checkBlockStatus = async () => {
      const storedBlockEndTime = localStorage.getItem('blockEndTime');
      const storedAttempts = localStorage.getItem('loginAttempts');
      
      if (storedAttempts) {
        setLoginAttempts(parseInt(storedAttempts));
      }
      
      if (storedBlockEndTime) {
        const endTime = parseInt(storedBlockEndTime);
        if (endTime > Date.now()) {
          setIsBlocked(true);
          setBlockEndTime(endTime);
        } else {
          // Block time has expired
          localStorage.removeItem('blockEndTime');
          setIsBlocked(false);
        }
      }
    };
    
    checkBlockStatus();
  }, []);

  // Handle countdown timer when blocked
  useEffect(() => {
    let interval;
    
    if (isBlocked && blockEndTime) {
      interval = setInterval(() => {
        const timeLeft = Math.ceil((blockEndTime - Date.now()) / 1000);
        
        if (timeLeft <= 0) {
          setIsBlocked(false);
          localStorage.removeItem('blockEndTime');
          setLoginAttempts(0);
          localStorage.setItem('loginAttempts', '0');
          clearInterval(interval);
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBlocked, blockEndTime]);

  const blockUser = (minutes) => {
    const blockEndTime = Date.now() + (minutes * 60 * 1000);
    setIsBlocked(true);
    setBlockEndTime(blockEndTime);
    localStorage.setItem('blockEndTime', blockEndTime.toString());
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError(`Account is temporarily blocked. Try again in ${countdown} seconds.`);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Reset login attempts on successful login
      setLoginAttempts(0);
      localStorage.setItem('loginAttempts', '0');
      navigate('/');
    } catch (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      
      // Block user based on number of failed attempts
      if (newAttempts === 5) {
        blockUser(1); // Block for 1 minute
        setError('Too many failed login attempts. Account blocked for 1 minute.');
      } else if (newAttempts === 10) {
        blockUser(5); // Block for 5 minutes
        setError('Too many failed login attempts. Account blocked for 5 minutes.');
      } else if (newAttempts >= 15) {
        blockUser(15); // Block for 15 minutes
        setError('Too many failed login attempts. Account blocked for 15 minutes.');
      } else {
        setError('Invalid email or password. Attempts: ' + newAttempts);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen bg-gray-800">
      {/* Left side with login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="text-center">
            <h1 className="text-white text-3xl font-bold mb-2">Login</h1>
            <p className="text-gray-400 text-sm mb-8">
              Username
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 bg-white text-gray-800 border border-gray-300 rounded-md"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-white text-gray-800 border border-gray-300 rounded-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {isBlocked ? (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded text-center">
                Account temporarily blocked. <br />
                Try again in {Math.floor(countdown / 60)}:{countdown % 60 < 10 ? '0' + (countdown % 60) : countdown % 60}
              </div>
            ) : (
              <button
                type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  'LOGIN'
                )}
              </button>
            )}
            
            <div className="text-center mt-2">
              <a href="#" className="text-sm text-gray-400 hover:text-gray-300">
                Forgot password
              </a>
            </div>
          </form>
        </div>
      </div>
      
      {/* Right side with welcome message */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-gray-700 to-gray-900 items-center justify-center relative">
        <div className="text-center px-8">
          <h1 className="text-white text-5xl font-bold mb-6">Welcome back!</h1>
          <p className="text-gray-300 text-xl mb-8">
            Login in Car Rental <br/>Administration page
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;