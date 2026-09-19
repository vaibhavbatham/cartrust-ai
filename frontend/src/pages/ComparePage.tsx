import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Scale,
  Car,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ArrowRight,
  Plus,
  X,
  FileText,
  MessageSquare,
  ArrowUpRight,
  HelpCircle,
  Wrench,
  Gauge,
  MapPin,
  IndianRupee,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { OdometerBadge } from '../components/StatusBadges';

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [comparisonItems, setComparisonItems] = useState<any[]>([]);
  const [neutralAnalysis, setNeutralAnalysis] = useState<string>('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Selected vehicle IDs in comparison
  const vehiclesParam = searchParams.get('vehicles') || searchParams.get('ids') || '';

  // 1. Fetch all vehicles for the dropdown / selector
  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const res = await api.get('/vehicles');
        setAllVehicles(res.data);
      } catch (err) {
        console.error('Failed to load fleet:', err);
      }
    };
    fetchFleet();
  }, []);

  // 2. Fetch comparison data whenever URL param changes
  useEffect(() => {
    const loadComparison = async () => {
      setLoading(true);
      setError('');
      try {
        let vIds = vehiclesParam
          ? vehiclesParam.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        // If less than 2 vehicles specified in URL, fetch initial 2 default active vehicles
        if (vIds.length < 2) {
          const fleetRes = await api.get('/vehicles');
          const fleet = fleetRes.data || [];
          if (fleet.length >= 2) {
            vIds = [fleet[0].id, fleet[1].id];
            setSearchParams({ vehicles: vIds.join(',') }, { replace: true });
          } else {
            setError('At least 2 vehicles are required in the registry to run a comparison.');
            setLoading(false);
            return;
          }
        }

        const compRes = await api.post('/compare', { vehicle_ids: vIds });
        const data = compRes.data;
        const items = data.comparison || data.vehicles || [];
        setComparisonItems(items);
        setNeutralAnalysis(data.neutral_analysis || data.neutral_summary || '');
        setHighlights(data.highlights || []);
      } catch (err: any) {
        console.error('Comparison error:', err);
        setError('Failed to load comparison data. Please ensure selected vehicles exist.');
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [vehiclesParam, setSearchParams]);

  // Handler to add a vehicle
  const handleAddVehicle = (vId: string) => {
    if (!vId) return;
    const currentIds = comparisonItems.map(it => it.vehicle_id);
    if (currentIds.includes(vId)) return;
    if (currentIds.length >= 4) {
      alert('You can compare a maximum of 4 vehicles side-by-side.');
      return;
    }
    const updated = [...currentIds, vId];
    setSearchParams({ vehicles: updated.join(',') });
  };

  // Handler to remove a vehicle
  const handleRemoveVehicle = (vId: string) => {
    const currentIds = comparisonItems.map(it => it.vehicle_id);
    if (currentIds.length <= 2) {
      alert('Comparison requires at least 2 vehicles. Add an alternative before removing this one.');
      return;
    }
    const updated = currentIds.filter(id => id !== vId);
    setSearchParams({ vehicles: updated.join(',') });
  };

  // Vehicles available to add
  const availableToAdd = allVehicles.filter(
    v => !comparisonItems.some(it => it.vehicle_id === v.id || it.vin === v.vin)
  );

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Scale className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Side-by-Side Vehicle Comparison
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Neutral, evidence-backed matrix comparing recorded specifications, odometer integrity, service logs, and insurance history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              Back to Fleet
            </Link>
          </div>
        </div>

        {/* Vehicle Selection & Filter Bar */}
        <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Currently Comparing:</span>
            {comparisonItems.map(item => (
              <span
                key={item.vehicle_id}
                className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white font-medium shadow-sm"
              >
                <span className="font-mono text-sky-400 text-[11px]">{item.registration_number || item.vin.slice(0, 8)}</span>
                <span>•</span>
                <span>{item.year} {item.make} {item.model}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVehicle(item.vehicle_id)}
                  className="p-0.5 hover:text-rose-400 rounded transition-colors ml-1"
                  title="Remove from comparison"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          {availableToAdd.length > 0 && comparisonItems.length < 4 && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                onChange={(e) => {
                  handleAddVehicle(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                className="bg-slate-950 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 w-full md:w-64"
              >
                <option value="" disabled>+ Add vehicle to compare...</option>
                {availableToAdd.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number ? `${v.registration_number} - ` : ''}{v.year} {v.make} {v.model} ({v.current_odometer?.toLocaleString()} km)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-rose-950/50 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-12 p-16 text-center text-slate-500 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
            Compiling comparative evidence matrix from connected databases...
          </div>
        ) : comparisonItems.length === 0 ? (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Scale className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold text-sm">No vehicles selected for comparison</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Select at least 2 vehicles from your registry to view comparative metrics.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* COMPARISON MATRIX TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60">
                      <th className="p-4 sm:p-6 w-1/4 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Feature / Metric
                      </th>
                      {comparisonItems.map(item => (
                        <th key={item.vehicle_id} className="p-4 sm:p-6 min-w-[240px] align-top">
                          <div className="space-y-2">
                            {/* License plate */}
                            <div className="inline-flex items-center rounded border border-slate-300 bg-white shadow-sm overflow-hidden text-slate-900">
                              <div className="bg-blue-800 text-[9px] font-bold text-white px-1.5 py-0.5 flex flex-col items-center justify-center leading-none">
                                <span>🇮🇳</span>
                                <span className="text-[7px]">IND</span>
                              </div>
                              <span className="px-2 py-0.5 font-mono text-xs font-black tracking-widest uppercase">
                                {item.registration_number || item.vin.slice(0, 10)}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-white leading-tight">
                              {item.year} {item.make} {item.model}
                            </h3>
                            <p className="text-xs text-slate-400">
                              {item.variant || 'Standard'}
                            </p>

                            <div className="pt-2">
                              {item.price ? (
                                <span className="text-base font-extrabold text-amber-300 font-mono">
                                  ₹{Number(item.price).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Price on request</span>
                              )}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {/* SECTION 1: BASIC & TECHNICAL SPECIFICATIONS */}
                    <tr className="bg-slate-950/40">
                      <td colSpan={comparisonItems.length + 1} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-sky-400">
                        1. Technical Specifications
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Engine Capacity</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-200 font-semibold">
                          {it.engine_capacity || (it.engine_details ? `${it.engine_details}` : 'N/A')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Engine Type</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-300">
                          {it.engine_type || it.fuel_type}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Fuel & Transmission</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-300">
                          {it.fuel_type} • {it.transmission}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Seating & Body Type</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-300">
                          {it.seating_capacity || 5} Seater • {it.body_type || 'Passenger'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Exterior Color</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-300">
                          {it.color || 'Standard Factory'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Registration Location</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{it.location || 'India'}</span>
                        </td>
                      ))}
                    </tr>

                    {/* SECTION 2: MILEAGE & ODOMETER INTEGRITY */}
                    <tr className="bg-slate-950/40">
                      <td colSpan={comparisonItems.length + 1} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-sky-400">
                        2. Odometer Integrity & Mileage
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Recorded Mileage</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 font-bold text-white text-sm font-mono">
                          {it.mileage?.toLocaleString()} km
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Odometer Consistency</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6">
                          <OdometerBadge status={it.odometer_consistency_status} />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">History Coverage</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6">
                          <span className="font-bold text-emerald-400">{it.history_coverage_pct}%</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Maintenance Evidence Rating</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold text-[11px]">
                            {it.maintenance_evidence_rating}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* SECTION 3: DOCUMENTED SERVICE & EXPENDITURE */}
                    <tr className="bg-slate-950/40">
                      <td colSpan={comparisonItems.length + 1} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-sky-400">
                        3. Documented Maintenance & Spend
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Verified Invoices</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 font-semibold text-emerald-400">
                          {it.verified_invoices_count} invoice(s)
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Total Service Events</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 font-medium text-slate-200">
                          {it.service_records_count} service logs
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Recorded Maintenance Spend</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 font-mono font-bold text-amber-300">
                          ₹{Number(it.total_maintenance_expenditure || 0).toLocaleString('en-IN')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Latest Documented Service</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 text-slate-400">
                          {it.latest_service_date || 'No recent date recorded'}
                        </td>
                      ))}
                    </tr>

                    {/* SECTION 4: SAFETY & DAMAGE RECORDS */}
                    <tr className="bg-slate-950/40">
                      <td colSpan={comparisonItems.length + 1} className="py-2.5 px-4 sm:px-6 font-bold uppercase tracking-wider text-[11px] text-sky-400">
                        4. Insurance Claims & Risk Signals
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Documented Collision Claims</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6">
                          {it.accident_claims_count === 0 ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 0 Claims
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {it.accident_claims_count} Claim(s)
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-400">Data Integrity Conflicts</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-3 px-4 sm:px-6 font-semibold">
                          {it.data_conflicts_count > 0 ? (
                            <span className="text-rose-400">{it.data_conflicts_count} Conflict(s)</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* SECTION 5: ACTION BUTTONS */}
                    <tr className="bg-slate-950/60">
                      <td className="py-4 px-4 sm:px-6 font-medium text-slate-400">Actions</td>
                      {comparisonItems.map(it => (
                        <td key={it.vehicle_id} className="py-4 px-4 sm:px-6 space-y-2">
                          <Link
                            to={`/vehicles/${it.registration_number || it.vin || it.vehicle_id}`}
                            className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            View Dossier <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/api/v1/reports/${it.vehicle_id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-center flex items-center justify-center gap-1 transition-colors"
                            >
                              <FileText className="w-3 h-3" /> PDF
                            </a>
                            <Link
                              to={`/assistant?vehicle=${encodeURIComponent(it.registration_number || it.vin)}`}
                              className="flex-1 px-2 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 rounded-lg text-center flex items-center justify-center gap-1 border border-indigo-800/60 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" /> AI
                            </Link>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* FACTUAL HIGHLIGHTS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comparisonItems.map(it => (
                <div key={it.vehicle_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <span className="font-mono text-xs font-bold text-sky-400 uppercase">
                      {it.registration_number || it.vin.slice(0, 10)}
                    </span>
                    <span className="text-xs text-slate-400">{it.make} {it.model}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Factual Highlights:</h4>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {(it.factual_highlights && it.factual_highlights.length > 0) ? (
                      it.factual_highlights.map((h: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                          <span>Recorded odometer: {it.mileage?.toLocaleString()} km</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                          <span>{it.service_records_count} documented service records</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              ))}
            </div>

            {/* NEUTRAL COMPARISON GUIDANCE PROTOCOL */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl text-xs leading-relaxed space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>CarTrust Neutral Guidance Protocol</span>
              </div>

              {highlights.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Comparative Observations:
                  </span>
                  <ul className="space-y-1.5 text-slate-300">
                    {highlights.map((hl, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-sky-400 font-bold">•</span>
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-slate-400">
                {neutralAnalysis || "CarTrust AI presents objective, side-by-side evidence grounded in verifiable records. No vehicle is awarded arbitrary 'winner' or 'best' ratings; decisions should align with individual buyer risk tolerance and verified on-site inspection."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
