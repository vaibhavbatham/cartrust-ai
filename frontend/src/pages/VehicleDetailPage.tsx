import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Shield, Clock, Wrench, AlertCircle, FileCheck, FileText, Download, ArrowRight, MessageSquare, AlertTriangle } from 'lucide-react';
import { VerificationBadge, OdometerBadge } from '../components/StatusBadges';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVehicleData = async () => {
      try {
        const vRes = await api.get(`/vehicles/${id}`);
        setVehicle(vRes.data);
        const [intelRes, tlRes] = await Promise.all([
          api.get(`/vehicles/${vRes.data.id}/intelligence`),
          api.get(`/vehicles/${vRes.data.id}/timeline`)
        ]);
        setIntelligence(intelRes.data);
        setTimeline(tlRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadVehicleData();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-12 text-center text-slate-400">Loading Vehicle Intelligence Profile...</div>;
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 p-12 text-center text-slate-400">
        <h2 className="text-xl font-bold text-white mb-2">Vehicle Not Found</h2>
        <p className="text-sm">No historical records are currently available for identifier: {id}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-md">
                  {vehicle.vin}
                </span>
                {vehicle.registration_number && (
                  <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {vehicle.registration_number}
                  </span>
                )}
                <OdometerBadge status={intelligence?.odometer_consistency_status || 'CONSISTENT'} />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {vehicle.year} {vehicle.make} {vehicle.model} <span className="text-slate-400 font-normal text-xl">{vehicle.variant}</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {vehicle.fuel_type} • {vehicle.transmission} • {vehicle.current_odometer?.toLocaleString()} km recorded mileage
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`/api/v1/reports/${vehicle.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-sky-400" />
                Download PDF Report
              </a>
              <Link
                to="/assistant"
                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-sky-950 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Ask Assistant
              </Link>
            </div>
          </div>

          {/* Metric Badges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800 text-xs">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">History Coverage</span>
              <span className="text-xl font-bold text-emerald-400">{intelligence?.history_coverage_pct}%</span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Maintenance Evidence</span>
              <span className="text-xl font-bold text-slate-200">{intelligence?.maintenance_evidence_rating}</span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Insurance Claims</span>
              <span className="text-xl font-bold text-rose-400">{intelligence?.verified_claims_count} Verified</span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Data Conflicts</span>
              <span className={`text-xl font-bold ${intelligence?.data_conflicts_count > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {intelligence?.data_conflicts_count}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            Evidence-Based Vehicle Timeline ({timeline.length} Milestones)
          </h2>
          <span className="text-xs text-slate-400">Provenance and verification tracked for each milestone</span>
        </div>

        {/* Timeline Content */}
        <div className="space-y-4">
          {timeline.map((event, idx) => (
            <div key={event.id || idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded">
                    {event.event_date}
                  </span>
                  <h3 className="font-bold text-white text-base">{event.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  {event.odometer && (
                    <span className="text-xs font-mono font-medium text-slate-300">
                      {event.odometer.toLocaleString()} km
                    </span>
                  )}
                  <VerificationBadge status={event.verification_status} />
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-2">{event.description}</p>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Source: <strong className="text-slate-400">{event.source}</strong></span>
                <span>•</span>
                <span>Confidence: {(event.confidence_score * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
