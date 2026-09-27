import React, { useState } from 'react';
import { Video, ShieldCheck, Sun, Moon, LogOut, LayoutDashboard, History, User, Sliders, Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* ConnectX Brand Logo & Main Nav */}
        <div className="flex items-center gap-8">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-3 group">
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

          {/* Authenticated Desktop Nav Links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isActive('/dashboard') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/my-meetings"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isActive('/my-meetings') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>My Meetings</span>
              </Link>

              <Link
                to="/profile"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isActive('/profile') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>

              <Link
                to="/settings"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isActive('/settings') ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </nav>
          )}
        </div>

        {/* Right side controls & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>P2P Encrypted</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Auth Desktop State Controls */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-3 border-l border-slate-800 pl-3">
              <Link to="/profile" className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700 transition">
                <div className="w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-3">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-900 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur-2xl px-4 py-5 space-y-4 animate-fade-in">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100">{user?.name}</span>
                  <span className="text-[10px] text-slate-400">{user?.email}</span>
                </div>
              </div>

              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" /> Dashboard
              </Link>
              <Link
                to="/my-meetings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <History className="w-4 h-4 text-indigo-400" /> My Meetings
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <User className="w-4 h-4 text-indigo-400" /> Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <Sliders className="w-4 h-4 text-indigo-400" /> Settings
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 border border-rose-500/20 mt-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 border border-slate-700"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 shadow-lg shadow-indigo-600/20"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
