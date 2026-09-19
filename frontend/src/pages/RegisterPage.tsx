import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { Shield, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile_number: '',
    password: '',
    confirm_password: '',
    terms_accepted: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
          <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-sm text-slate-400 mb-6">
            A verification token has been generated. In development mode, email is verified and you can immediately proceed to login.
          </p>
          <Link
            to="/login"
            className="block w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg text-sm"
          >
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-sky-600 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Create Account</h2>
        </div>

        {error && (
          <div className="p-3 mb-4 text-xs font-semibold rounded-lg bg-rose-950 border border-rose-800 text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
              <input
                type="text"
                name="first_name"
                required
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Rahul"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                required
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Sharma"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="rahul@example.demo"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Mobile</label>
            <input
              type="text"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              placeholder="+919876543210"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Confirm</label>
              <input
                type="password"
                name="confirm_password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="terms"
              name="terms_accepted"
              checked={formData.terms_accepted}
              onChange={handleChange}
              className="rounded bg-slate-950 border-slate-700 text-sky-600"
            />
            <label htmlFor="terms" className="text-xs text-slate-400">
              I accept the CarTrust terms and evidence verification protocol.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg text-sm mt-2 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating...' : 'Register'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-sky-400 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
