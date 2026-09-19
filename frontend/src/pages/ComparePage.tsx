import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { ArrowRight, CheckCircle2, AlertTriangle, Shield, Scale } from 'lucide-react';
import { VerificationBadge, OdometerBadge } from '../components/StatusBadges';

export const ComparePage: React.FC = () => {
  const [comparison, setComparison] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runCompare = async () => {
      try {
        const vRes = await api.get('/vehicles');
        const ids = vRes.data.slice(0, 2).map((v: any) => v.id);
        if (ids.length >= 2) {
          const cRes = await api.post('/vehicles/compare', { vehicle_ids: ids });
          setComparison(cRes.data.comparison);
          setAnalysis(cRes.data.neutral_analysis);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    runCompare();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-6 h-6 text-sky-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Side-by-Side Vehicle Comparison</h1>
        </div>
        <p className="text-sm text-slate-400 mb-8">
          Neutral evidence matrix comparing recorded milestones without prescriptive buyer bias.
        </p>

        {loading ? (
          <div className="text-sm text-slate-400">Loading comparison matrix...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {comparison.map((c) => (
                <div key={c.vehicle_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded">
                      {c.vin}
                    </span>
                    <span className="text-xs text-slate-400">{c.year}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{c.make} {c.model}</h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Current Odometer:</span>
                      <span className="font-bold text-white">{c.mileage?.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">History Coverage:</span>
                      <span className="font-bold text-emerald-400">{c.history_coverage_pct}%</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Maintenance Evidence:</span>
                      <span className="font-bold text-slate-200">{c.maintenance_evidence_rating}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Odometer Integrity:</span>
                      <OdometerBadge status={c.odometer_consistency_status} />
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Verified Insurance Claims:</span>
                      <span className="font-bold text-rose-400">{c.verified_claims_count}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Data Quality Conflicts:</span>
                      <span className={`font-bold ${c.data_conflicts_count > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {c.data_conflicts_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300 block mb-1">Neutral Guidance Protocol:</strong>
              {analysis}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
