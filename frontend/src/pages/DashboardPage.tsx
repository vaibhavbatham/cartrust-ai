import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { Car, Plus, ShieldCheck, AlertTriangle, FileText, MessageSquare, ArrowUpRight, Upload, MapPin, Search } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPlate, setSearchPlate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await api.get('/vehicles');
        setVehicles(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim()) {
      const clean = searchPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      navigate(`/vehicles/${clean || searchPlate.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome, {user?.first_name || 'Rahul'} 👋
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Active profile: {user?.profile?.city ? `${user.profile.city}, ${user.profile.state || 'India'}` : 'Bhopal, Madhya Pradesh'} • Verified Customer
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/vehicles/add"
              className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-sky-950 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Vehicle
            </Link>
            <Link
              to="/upload"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              Upload Invoice
            </Link>
            <Link
              to="/assistant"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-indigo-950 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </Link>
          </div>
        </div>

        {/* Quick Search Plate Bar */}
        <div className="mt-8 p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Search className="w-4 h-4 text-sky-400" />
            <span className="font-semibold">Search by Plate:</span>
            <span className="text-xs text-slate-500 hidden md:inline">MP04AB1234, DL01AB1234, MH12CD5678</span>
          </div>
          <form onSubmit={handleSearch} className="w-full sm:w-auto flex gap-2">
            <input
              type="text"
              placeholder="e.g. MP 04 AB 1234"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="px-3.5 py-2 text-xs font-mono uppercase bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 w-full sm:w-60"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Find
            </button>
          </form>
        </div>

        {/* Vehicles Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-sky-400" />
              Verified Vehicles Registry
            </h2>
            <div className="flex items-center gap-3">
              <Link
                to="/vehicles/add"
                className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Onboard Vehicle
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
              <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-sm">No vehicles currently registered in your garage</p>
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  to="/vehicles/add"
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add New Vehicle
                </Link>
                <button
                  onClick={() => navigate('/vehicles/MP04AB1234')}
                  className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                >
                  Inspect Canonical Honda City Demo
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group flex flex-col justify-between shadow-lg">
                  <div>
                    {/* Indian License Plate Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="inline-flex items-center rounded border border-slate-300 bg-white shadow-sm overflow-hidden text-slate-900">
                        <div className="bg-blue-800 text-[9px] font-bold text-white px-1 py-0.5 flex flex-col items-center justify-center leading-none">
                          <span>🇮🇳</span>
                          <span className="text-[7px]">IND</span>
                        </div>
                        <span className="px-2 py-0.5 font-mono text-xs font-black tracking-widest uppercase">
                          {v.registration_number || v.vin.slice(0, 10)}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                        {v.year}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                      {v.make} {v.model}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">
                      {v.variant || 'Standard'} • {v.fuel_type} • {v.transmission}
                    </p>

                    {v.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{v.location}</span>
                      </div>
                    )}

                    <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current Odometer:</span>
                        <span className="font-semibold text-slate-200">{v.current_odometer?.toLocaleString()} km</span>
                      </div>
                      {v.price && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Valuation / Price:</span>
                          <span className="font-semibold text-amber-300">₹{Number(v.price).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">History Coverage:</span>
                        <span className="font-semibold text-emerald-400">{v.history_coverage_pct || 72}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">VIN:</span>
                        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[160px]">{v.vin}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                      to={`/vehicles/${v.registration_number || v.vin}`}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      View Intelligence <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    <a
                      href={`/api/v1/reports/${v.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
