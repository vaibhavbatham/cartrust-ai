import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Shield, Users, Car, CheckCircle2, AlertTriangle, Activity, Database } from 'lucide-react';
import { VerificationBadge } from '../components/StatusBadges';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [evidenceQueue, setEvidenceQueue] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const [sRes, uRes, eRes, aRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/users'),
          api.get('/admin/evidence/review'),
          api.get('/admin/audit')
        ]);
        setStats(sRes.data);
        setUsers(uRes.data);
        setEvidenceQueue(eRes.data);
        setAuditLogs(aRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadAdmin();
  }, []);

  const handleVerify = async (evId: string, status: string) => {
    try {
      await api.patch(`/admin/evidence/${evId}`, {
        verification_method: 'MANUAL_ADMIN',
        new_status: status,
        notes: 'Admin review verification override'
      });
      setEvidenceQueue(evidenceQueue.filter(e => e.id !== evId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading Admin Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin & Compliance Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Platform monitoring, evidence moderation queue, and audit logs.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-slate-400 block mb-1">Total Users</span>
            <span className="text-2xl font-bold text-white">{stats?.total_users}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-slate-400 block mb-1">Total Vehicles</span>
            <span className="text-2xl font-bold text-sky-400">{stats?.total_vehicles}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-slate-400 block mb-1">Open DQ Issues</span>
            <span className="text-2xl font-bold text-rose-400">{stats?.open_dq_issues}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-slate-400 block mb-1">Pipeline Health</span>
            <span className="text-2xl font-bold text-emerald-400">{stats?.pipeline_status}</span>
          </div>
        </div>

        {/* Evidence Review Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Evidence Moderation Queue</h2>
          {evidenceQueue.length === 0 ? (
            <p className="text-xs text-slate-500">No unverified evidence currently waiting in queue.</p>
          ) : (
            <div className="space-y-3">
              {evidenceQueue.map(e => (
                <div key={e.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white">{e.title}</h4>
                    <p className="text-slate-400 mt-0.5">{e.description}</p>
                    <span className="text-slate-500 mt-1 block">Source: {e.source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(e.id, 'VERIFIED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleVerify(e.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-semibold rounded-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Recent Audit Events</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-400">
              <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Actor</th>
                  <th className="p-2.5">Resource</th>
                  <th className="p-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td className="p-2.5 font-semibold text-white">{log.action}</td>
                    <td className="p-2.5">{log.actor_email || log.actor_id || 'SYSTEM'}</td>
                    <td className="p-2.5">{log.resource_type}</td>
                    <td className="p-2.5 font-mono">{log.created_at?.slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
