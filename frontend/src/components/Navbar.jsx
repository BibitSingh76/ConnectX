import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  ShieldCheck,
  ChevronDown,
  Home,
  History,
  User,
  Sliders,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = React.memo(() => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or Escape key press
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const handleNavigate = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* LEFT: ConnectX Brand Logo & PRO Badge */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
              <Video className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                  Connect<span className="text-indigo-500">X</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  PRO
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* RIGHT: P2P Encrypted Indicator + User Profile Dropdown */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>P2P Encrypted</span>
          </div>

          {/* User Profile Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="User menu"
              aria-expanded={dropdownOpen}
            >
              <div className="w-7 h-7 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-xs">
                {isAuthenticated ? userInitial : <User className="w-3.5 h-3.5" />}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Overlay */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {isAuthenticated ? (
                  <>
                    {/* Header Section */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800">
                      <div className="w-9 h-9 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                        {userInitial}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {user?.name || 'User'}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {user?.email || ''}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="py-1">
                      <button
                        onClick={() => handleNavigate('/')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                          isActive('/')
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Home className="w-4 h-4 text-indigo-400" />
                        <span>Home</span>
                      </button>

                      <button
                        onClick={() => handleNavigate('/my-meetings')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                          isActive('/my-meetings')
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <History className="w-4 h-4 text-indigo-400" />
                        <span>My Meetings</span>
                      </button>

                      <button
                        onClick={() => handleNavigate('/profile')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                          isActive('/profile')
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <User className="w-4 h-4 text-indigo-400" />
                        <span>Profile</span>
                      </button>

                      <button
                        onClick={() => handleNavigate('/settings')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                          isActive('/settings')
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <span>Settings</span>
                      </button>
                    </div>

                    {/* Logout Section */}
                    <div className="border-t border-slate-800 pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-1">
                    <button
                      onClick={() => handleNavigate('/')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                        isActive('/')
                          ? 'bg-indigo-600/20 text-indigo-400'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Home className="w-4 h-4 text-indigo-400" />
                      <span>Home</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('/login')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                        isActive('/login')
                          ? 'bg-indigo-600/20 text-indigo-400'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <LogIn className="w-4 h-4 text-indigo-400" />
                      <span>Login</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('/register')}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition ${
                        isActive('/register')
                          ? 'bg-indigo-600/20 text-indigo-400'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 text-indigo-400" />
                      <span>Register</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

