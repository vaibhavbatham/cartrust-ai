import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPassword123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-sky-600 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Sign In to CarTrust AI</h2>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs font-semibold rounded-lg bg-rose-950 border border-rose-800 text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                placeholder="name@example.demo"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 font-medium mb-2.5">Auto-fill Demo Credentials:</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => autofill('customer@cartrust.demo')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded border border-slate-700 transition-colors"
            >
              Customer (Rahul)
            </button>
            <button
              type="button"
              onClick={() => autofill('admin@cartrust.demo')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-slate-700 transition-colors"
            >
              Admin (Aditi)
            </button>
            <button
              type="button"
              onClick={() => autofill('mechanic@cartrust.demo')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 transition-colors"
            >
              Mechanic
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Need an account?{' '}
          <Link to="/register" className="text-sky-400 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
