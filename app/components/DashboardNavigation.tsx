'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChangePasswordModal } from './ChangePasswordModal';

function HamburgerIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function CloseIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function DashboardNavigation() {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const Navigation = () => (
    <div className="flex-grow">
      <ul className="space-y-2">
        <li>
          <Link
            href="/dashboard"
            onClick={() => setIsNavOpen(false)}
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors font-semibold
              ${pathname === '/dashboard'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
          >
            Calendar
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/transactions"
            onClick={() => setIsNavOpen(false)}
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors font-semibold
              ${pathname === '/dashboard/transactions'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
          >
            Mark Transactions
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard/capital-accounts"
            onClick={() => setIsNavOpen(false)}
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors font-semibold
              ${pathname === '/dashboard/capital-accounts'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
          >
            Capital Accounts
          </Link>
        </li>
      </ul>
    </div>
  );

  const NavigationFooter = () => {
    const router = useRouter();

    const handleLogout = () => {
      document.cookie = 'USER_DATA=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      router.push('/');
    };

    return <div className="space-y-2">
      <button
        onClick={() => {
          setShowChangePassword(true);
          setIsNavOpen(false);
        }}
        className="w-full px-4 py-2 text-left text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
      >
        Change Password
      </button>
      <button
        onClick={handleLogout}
        className="w-full px-4 py-2 text-left text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
      >
        Logout
      </button>
    </div>
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex w-64 bg-gray-100 border-r border-gray-200 p-6 flex-col h-full">
        <Navigation />
        <NavigationFooter />
      </nav>

      {/* Mobile Navigation Overlay */}
      <div className="lg:hidden p-4 absolute z-50">
        <HamburgerIcon onClick={() => setIsNavOpen(true)} />
      </div>

      <AnimatePresence>
        {isNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavOpen(false)}
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-gray-100 p-6 flex flex-col z-50"
            >
              <div className="flex justify-end mb-6">
                <CloseIcon onClick={() => setIsNavOpen(false)} />
              </div>
              <Navigation />
              <NavigationFooter />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
} 