import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Car, Search, User, LogOut, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-gradient-to-tr from-sky-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">CarTrust <span className="text-sky-400">AI</span></span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Intelligence</span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/vehicles" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
            <Search className="w-4 h-4 text-sky-400" />
            Search Vehicles
          </Link>
          <Link to="/compare" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Compare
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="text-sm font-medium text-slate-200 hover:text-sky-400 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                Dashboard
              </Link>
              {user.roles?.includes('ADMIN') && (
                <Link to="/admin/dashboard" className="text-xs font-semibold text-purple-300 bg-purple-950/80 border border-purple-800 px-2.5 py-1 rounded-md">
                  Admin
                </Link>
              )}
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5">
                Login
              </Link>
              <Link to="/register" className="text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white px-4 py-1.5 rounded-lg shadow-sm transition-colors">
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
