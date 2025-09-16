/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon, LogoutIcon, CreditCardIcon, UserIcon, GridIcon } from './icons';

interface HeaderProps {
    onLogoClick: () => void;
    isAuthenticated: boolean;
    userName?: string;
    userCredits?: number;
    hasGalleryItems?: boolean;
    onLogout?: () => void;
    onAccountClick?: () => void;
    onPricingClick?: () => void;
    onGalleryClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onLogoClick, 
    isAuthenticated, 
    userName, 
    userCredits,
    hasGalleryItems,
    onLogout,
    onAccountClick,
    onPricingClick,
    onGalleryClick
}) => {
  return (
    <header className="w-full py-4 px-4 sm:px-8 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between">
      <div className="flex-1 text-left">
        <span className="text-sm text-gray-400 hidden md:block">
            Created by Venky
        </span>
      </div>
      
      <div className="flex-shrink-0">
          <button 
            onClick={onLogoClick} 
            className="flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg p-1 disabled:cursor-not-allowed"
            disabled={!isAuthenticated}
            aria-label="Go to home screen"
          >
              <SparkleIcon className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight text-gray-100">
                ImageGenie AI
              </h1>
          </button>
      </div>
      
      {/* FIX: Re-written this block to fix JSX parsing errors, likely caused by invisible characters. */}
      <div className="flex-1 text-right">
        {isAuthenticated && userName ? (
          <div className="flex items-center justify-end gap-2 sm:gap-4">
            {hasGalleryItems && (
              <button
                onClick={onGalleryClick}
                className="flex items-center gap-2 text-sm text-gray-300 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Open Gallery"
              >
                  <GridIcon className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:block font-semibold">Gallery</span>
              </button>
            )}
            <button
              onClick={onPricingClick}
              className="flex items-center gap-2 text-sm text-gray-300 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Buy Credits"
            >
              <CreditCardIcon className="w-4 h-4 text-yellow-400" />
              <span className="hidden md:block font-semibold">{userCredits} Credits</span>
              <span className="md:hidden font-semibold">{userCredits}</span>
            </button>
            <button
              onClick={onAccountClick}
              className="p-1.5 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Open Account Page"
            >
              <UserIcon className="w-6 h-6" />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
              aria-label="Logout"
            >
              <LogoutIcon className="w-5 h-5" />
              <span className="hidden md:block">Logout</span>
            </button>
          </div>
        ) : (
          <a
            href="https://www.instagram.com/_venky__21"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-blue-400 transition-colors hidden md:block"
          >
            Follow on Instagram
          </a>
        )}
      </div>
    </header>
  );
};

export default Header;