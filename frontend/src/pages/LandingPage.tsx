import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Search, FileText, CheckCircle, AlertTriangle, ArrowRight, Eye, Cpu, Database } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [searchVin, setSearchVin] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVin.trim()) {
      navigate(`/vehicles/${encodeURIComponent(searchVin.trim().toUpperCase())}`);
    }
  };

  const loadDemo = (vin: string) => {
    navigate(`/vehicles/${vin}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-slate-950 to-slate-950"></div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-semibold tracking-wide uppercase mb-6">
            <ShieldCheck className="w-4 h-4" />
            Provenance & Evidence Based Used-Car Intelligence
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Understand the <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-200">evidence</span> behind every used car.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            CarTrust AI never pretends to know what available records cannot prove. Verified claims, odometer chronologies, and OCR invoices tracked with transparent provenance.
          </p>

          {/* Quick Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl shadow-sky-950/50 mb-6">
            <div className="flex-1 flex items-center gap-3 px-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Synthetic VIN or Registration (e.g. DEMO-VIN-HC-2019-001)"
                value={searchVin}
                onChange={(e) => setSearchVin(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none placeholder-slate-500 text-white uppercase font-mono"
              />
            </div>
            <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2">
              Lookup
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Canonical Demos */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-slate-400 font-medium">Explore Golden Demos:</span>
            <button
              onClick={() => loadDemo('DEMO-VIN-HC-2019-001')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 font-mono transition-colors"
            >
              Honda City (Verified Claim & Brake Invoice)
            </button>
            <button
              onClick={() => loadDemo('DEMO-VIN-SW-2020-002')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-900 text-rose-400 font-mono transition-colors"
            >
              Maruti Swift (Odometer Rollback Anomaly)
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
