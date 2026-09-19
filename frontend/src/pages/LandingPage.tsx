import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Search, FileText, CheckCircle, AlertTriangle, ArrowRight, Eye, Cpu, Database, Plus, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Normalize spaces, dashes, dots to uppercase
  const normalizedQuery = useMemo(() => {
    return searchQuery.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      // Use normalized query if it matches plate or VIN format
      const target = normalizedQuery.length >= 6 ? normalizedQuery : query.toUpperCase();
      navigate(`/vehicles/${encodeURIComponent(target)}`);
    }
  };

  const loadDemo = (identifier: string) => {
    navigate(`/vehicles/${identifier}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-slate-950 to-slate-950"></div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            Provenance & Evidence Based Used-Car Intelligence
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Understand the <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-200">evidence</span> behind every used car.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Search any Indian vehicle by registration plate or VIN. Grounded in verified service invoices, inspection logs, and insurance claims.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mb-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl shadow-sky-950/50">
              <div className="flex-1 flex items-center gap-3 px-3 py-1">
                <Search className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Enter Vehicle Plate (e.g. MP 04 AB 1234) or VIN"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm sm:text-base focus:outline-none placeholder-slate-500 text-white uppercase font-mono tracking-wider"
                />
              </div>
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-sky-900/40"
              >
                Search Vehicle
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Real-time Normalization Feedback */}
            {searchQuery.trim() && (
              <div className="mt-2.5 flex items-center justify-center gap-2 text-xs">
                <span className="text-slate-400">Searching normalized plate:</span>
                <span className="font-mono px-2.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold tracking-widest">
                  {normalizedQuery}
                </span>
              </div>
            )}
          </div>

          {/* Quick Guidance & Add Vehicle Action */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs mb-8">
            <span className="text-slate-400">Supported formats:</span>
            <span className="font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">MP04AB1234</span>
            <span className="font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">DL01AB1234</span>
            <span className="font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">MH12CD5678</span>
            <span className="font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">22BH1234AA</span>
            <span className="text-slate-500">•</span>
            <Link
              to="/vehicles/add"
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Vehicle
            </Link>
          </div>

          {/* Canonical Demos */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-slate-400 font-medium">Quick Demo Vehicles:</span>
            <button
              onClick={() => loadDemo('MP04AB1234')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 font-mono transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              MP04AB1234 (Honda City • Clean)
            </button>
            <button
              onClick={() => loadDemo('DL01XY5678')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-900 text-rose-300 font-mono transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              DL01XY5678 (Swift • Rollback Anomaly)
            </button>
            <button
              onClick={() => loadDemo('HR26CR9900')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-900 text-amber-300 font-mono transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              HR26CR9900 (Creta • Crash Record)
            </button>
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="py-20 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 mb-5">
            <Eye className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Fabricated Knowledge</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            If there is no record of a clutch replacement, we explicitly report: <em>"No available evidence"</em>, never assuming unverified vehicle maintenance.
          </p>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-5">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Medallion Data Architecture</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ingestion across Bronze raw records, Silver deduplication and entity resolution, and Gold analytics feature tables designed for Azure/Databricks scale.
          </p>
        </div>

        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 mb-5">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">OCR & Issuer Verification</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            OCR extracts invoice details, which are cross-verified with simulated issuer service center APIs before upgrading status to <strong>VERIFIED</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
