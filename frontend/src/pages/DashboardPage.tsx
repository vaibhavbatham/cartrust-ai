import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { Car, Plus, ShieldCheck, AlertTriangle, FileText, MessageSquare, ArrowUpRight, Upload } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-6">
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
          <div className="flex items-center gap-3">
            <Link
              to="/upload"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              Upload Invoice
            </Link>
            <Link
              to="/assistant"
              className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-sky-950 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI Assistant
            </Link>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-sky-400" />
              My Vehicles
            </h2>
            <button
              onClick={() => navigate('/vehicles/DEMO-VIN-HC-2019-001')}
              className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
            >
              View Canonical Honda City Demo
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
              <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-sm">No vehicles currently registered in your garage</p>
              <button
                onClick={() => navigate('/vehicles/DEMO-VIN-HC-2019-001')}
                className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg bg-sky-600 text-white"
              >
                Inspect Canonical Honda City Demo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs text-sky-400 bg-sky-950/60 border border-sky-900/80 px-2 py-0.5 rounded">
                        {v.vin}
                      </span>
                      <span className="text-xs text-slate-400">{v.year}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                      {v.make} {v.model}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      {v.variant || 'Standard'} • {v.fuel_type} • {v.transmission}
                    </p>

                    <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current Mileage:</span>
                        <span className="font-semibold text-slate-200">{v.current_odometer?.toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">History Coverage:</span>
                        <span className="font-semibold text-emerald-400">{v.history_coverage_pct || 72}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Verified Evidence:</span>
                        <span className="font-semibold text-slate-200">{v.verified_evidence_count || 1} records</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                      to={`/vehicles/${v.vin}`}
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
