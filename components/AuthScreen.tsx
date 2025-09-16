/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UserIcon, LockIcon, EmailIcon } from './icons';
import Spinner from './Spinner';
import { auth } from '../firebase';
// FIX: Removed modular Firebase v9 auth imports to fix module errors.
import { createUserProfile } from '../services/userService';

const AuthScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (authMode === 'signup') {
      // Validation for signup
      if (!name || !email || !password || !confirmPassword) {
        setError('All fields are required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
      }
      if (!termsAccepted) {
        setError('You must accept the terms and conditions.');
        return;
      }

      setIsLoading(true);
      try {
        // FIX: Switched to Firebase v8 compat createUserWithEmailAndPassword method.
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // FIX: Switched to Firebase v8 compat sendEmailVerification method.
        await userCredential.user!.sendEmailVerification();
        await createUserProfile(userCredential.user!, name);
        setMessage("Verification email sent! Please check your inbox and verify your email before logging in.");
        // Clear form
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTermsAccepted(false);
        setAuthMode('login'); // Switch to login form
      } catch (err) {
          const firebaseError = err as { code?: string, message: string };
          if (firebaseError.code === 'auth/email-already-in-use') {
              setError('This email address is already in use. Please try logging in.');
          } else {
              setError(firebaseError.message || 'An unknown error occurred during signup.');
          }
      } finally {
          setIsLoading(false);
      }
    } else { // login
        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }
        
        setIsLoading(true);
        try {
            // FIX: Switched to Firebase v8 compat signInWithEmailAndPassword method.
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            if (!userCredential.user!.emailVerified) {
                setError("Please verify your email before logging in. We can send you a new verification link if needed.");
                // Log the user out so the onAuthStateChanged listener doesn't pick them up
                // FIX: Switched to Firebase v8 compat signOut method.
                await auth.signOut(); 
            }
            // onAuthStateChanged in App.tsx will handle successful login
        } catch (err) {
            const firebaseError = err as { code?: string, message: string };
            if (firebaseError.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(firebaseError.message || 'An unknown error occurred during login.');
            }
        } finally {
            setIsLoading(false);
        }
    }
  };

  const renderSignupForm = () => (
    <>
      <div className="relative">
          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
          />
      </div>
      <div className="relative">
          <EmailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
          />
      </div>
      <div className="relative">
          <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
          />
      </div>
      <div className="relative">
          <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
          />
      </div>
      <div className="flex items-center gap-3">
          <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500"
          />
          <label htmlFor="terms" className="text-sm text-gray-400">
              I accept the <a href="#" className="text-blue-400 hover:underline">Terms and Conditions</a>
          </label>
      </div>
    </>
  );

  const renderLoginForm = () => (
    <>
      <div className="relative">
          <EmailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
          />
      </div>
      <div className="relative">
          <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 rounded-lg py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              required
          />
      </div>
    </>
  );

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            <h2 className="text-3xl font-bold text-center text-gray-100 mb-2">
                {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-center text-gray-400 mb-6">
                {authMode === 'signup' ? 'Get 25 free credits to start your creative journey.' : 'Login to continue your creative journey.'}
            </p>

            <div className="flex items-center justify-center bg-gray-900/50 rounded-full p-1 mb-6">
                <button 
                    onClick={() => { setAuthMode('signup'); setError(null); setMessage(null); }}
                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-all ${authMode === 'signup' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}
                >
                    Sign Up
                </button>
                <button 
                    onClick={() => { setAuthMode('login'); setError(null); setMessage(null); }}
                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-all ${authMode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}
                >
                    Login
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {authMode === 'signup' ? renderSignupForm() : renderLoginForm()}

                {error && (
                  <div className="text-center bg-red-500/10 border border-red-500/20 p-3 rounded-lg w-full mt-2">
                      <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                {message && (
                  <div className="text-center bg-green-500/10 border border-green-500/20 p-3 rounded-lg w-full mt-2">
                      <p className="text-sm text-green-300">{message}</p>
                  </div>
                )}
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                    {isLoading ? <Spinner size="medium" /> : (authMode === 'signup' ? 'Sign Up' : 'Login')}
                </button>
            </form>
        </div>
    </div>
  );
};

export default AuthScreen;