import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, formatErrorMessage } from '../contexts/AuthContext';
import api from '../api/client';
import {
  Car,
  Plus,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MessageSquare,
  ArrowUpRight,
  Upload,
  MapPin,
  Search,
  Scale,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Wrench,
  FileSpreadsheet,
  X,
  Gauge,
  Info
} from 'lucide-react';
import { VerificationBadge, OdometerBadge } from '../components/StatusBadges';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPlate, setSearchPlate] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  // Edit Modal State
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    price: 0,
    location: '',
    color: '',
    current_odometer: 0,
    description: '',
    mileage_efficiency: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Modal State
  const [deletingVehicle, setDeletingVehicle] = useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const navigate = useNavigate();

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim()) {
      const clean = searchPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      navigate(`/vehicles/${clean || searchPlate.trim().toUpperCase()}`);
    }
  };

  const toggleCompare = (vId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(vId)) {
        return prev.filter(id => id !== vId);
      }
      if (prev.length >= 4) {
        alert('You can compare up to 4 vehicles simultaneously.');
        return prev;
      }
      return [...prev, vId];
    });
  };

  const openEditModal = (v: any) => {
    setEditingVehicle(v);
    setEditForm({
      price: v.price || 0,
      location: v.location || '',
      color: v.color || '',
      current_odometer: v.current_odometer || 0,
      description: v.description || '',
      mileage_efficiency: v.mileage_efficiency || ''
    });
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setSavingEdit(true);
    setEditError('');
    try {
      await api.put(`/vehicles/${editingVehicle.id}`, {
        price: Number(editForm.price) || null,
        location: editForm.location.trim() || null,
        color: editForm.color.trim() || null,
        current_odometer: Number(editForm.current_odometer) || 0,
        description: editForm.description.trim() || null,
        mileage_efficiency: editForm.mileage_efficiency.trim() || null
      });
      setEditingVehicle(null);
      await fetchVehicles();
    } catch (err: any) {
      setEditError(formatErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    setDeletingLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/vehicles/${deletingVehicle.id}`);
      setSelectedForCompare(prev => prev.filter(id => id !== deletingVehicle.id));
      setDeletingVehicle(null);
      await fetchVehicles();
    } catch (err: any) {
      setDeleteError(formatErrorMessage(err));
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 relative pb-28">
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
              to="/compare"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Scale className="w-4 h-4 text-indigo-400" />
              Compare Vehicles
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
            <span className="text-xs text-slate-500 hidden md:inline">MP04AB1234, DL01AB1234, MH12CD5678, MP04NZ4422</span>
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
              CarTrust Verified Vehicle Fleet ({vehicles.length})
            </h2>
            <div className="flex items-center gap-3">
              <Link
                to="/vehicles/add"
                className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Vehicle
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading vehicle intelligence registry...</div>
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
              {vehicles.map((v) => {
                const isSelected = selectedForCompare.includes(v.id);
                const canUserEdit = v.can_edit || (user && v.created_by_id === user.id);

                return (
                  <div
                    key={v.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all group flex flex-col justify-between shadow-lg relative ${
                      isSelected ? 'border-sky-500 bg-slate-900/90 ring-1 ring-sky-500' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Header: Comparison Checkbox + Plate + Synthetic/User Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => toggleCompare(v.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500'
                              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                          <span>Compare</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {v.is_synthetic ? (
                            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                              Synthetic Demo
                            </span>
                          ) : canUserEdit ? (
                            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                              Your Vehicle
                            </span>
                          ) : null}
                          <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                            {v.year}
                          </span>
                        </div>
                      </div>

                      {/* Indian License Plate Badge */}
                      <div className="mb-3">
                        <div className="inline-flex items-center rounded border border-slate-300 bg-white shadow-sm overflow-hidden text-slate-900">
                          <div className="bg-blue-800 text-[9px] font-bold text-white px-1.5 py-0.5 flex flex-col items-center justify-center leading-none">
                            <span>🇮🇳</span>
                            <span className="text-[7px]">IND</span>
                          </div>
                          <span className="px-2.5 py-0.5 font-mono text-xs font-black tracking-widest uppercase">
                            {v.registration_number || v.vin.slice(0, 10)}
                          </span>
                        </div>
                      </div>

                      {/* Make / Model / Variant */}
                      <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                        {v.make} {v.model}
                      </h3>
                      <p className="text-xs text-slate-400 mb-3">
                        {v.variant || 'Standard Edition'}
                      </p>

                      {/* Detailed Specifications Grid */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 mb-3 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Engine / Fuel</span>
                          <span className="text-slate-300 font-medium truncate block">
                            {v.engine_capacity ? `${v.engine_capacity}` : (v.engine_details || '1.5L')} • {v.fuel_type}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Transmission / Body</span>
                          <span className="text-slate-300 font-medium truncate block">
                            {v.transmission} • {v.body_type || 'Car'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Seating & Color</span>
                          <span className="text-slate-300 font-medium truncate block">
                            {v.seating_capacity || 5} Seater • {v.color || 'Standard'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Location</span>
                          <span className="text-slate-300 font-medium truncate block flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{v.location || 'Bhopal, MP'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Metrics: Odometer, Price, Coverage */}
                      <div className="space-y-1.5 border-t border-slate-800/80 pt-3 text-xs">
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
                          <span className="font-semibold text-emerald-400">{v.history_coverage_pct || 78}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Verified Invoices:</span>
                          <span className="font-medium text-slate-300">{v.verified_invoices_count || 0} document(s)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">VIN:</span>
                          <span className="font-mono text-[11px] text-slate-400 truncate max-w-[160px]">{v.vin}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Matrix */}
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/vehicles/${v.registration_number || v.vin || v.id}`}
                          className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-950/40 border border-sky-900/50 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          View Intelligence <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/compare?vehicles=${v.id}`}
                            className="text-xs font-medium text-slate-400 hover:text-indigo-300 flex items-center gap-1 p-1"
                            title="Compare with another vehicle"
                          >
                            <Scale className="w-3.5 h-3.5" /> Compare
                          </Link>
                          <a
                            href={`/api/v1/reports/${v.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 p-1"
                            title="Download Verified PDF Dossier"
                          >
                            <FileText className="w-3.5 h-3.5" /> PDF
                          </a>
                        </div>
                      </div>

                      {/* Quick Links: Documents, Service History, Edit/Delete (if authorized) */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/vehicles/${v.registration_number || v.vin || v.id}#service`}
                            className="hover:text-slate-200 flex items-center gap-1"
                          >
                            <Wrench className="w-3 h-3 text-slate-500" /> Services
                          </Link>
                          <span>•</span>
                          <Link
                            to={`/vehicles/${v.registration_number || v.vin || v.id}#documents`}
                            className="hover:text-slate-200 flex items-center gap-1"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-slate-500" /> Documents
                          </Link>
                        </div>

                        {canUserEdit && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(v)}
                              className="text-slate-400 hover:text-sky-300 flex items-center gap-1 p-1 transition-colors"
                              title="Edit your vehicle listing"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingVehicle(v);
                                setDeleteError('');
                              }}
                              className="text-slate-400 hover:text-rose-400 flex items-center gap-1 p-1 transition-colors"
                              title="Delete your vehicle listing"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Comparison Tray */}
      {selectedForCompare.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 border border-sky-500/80 shadow-2xl backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {selectedForCompare.length} Vehicles Selected
                </p>
                <p className="text-xs text-slate-400">
                  Ready for side-by-side evidence and specification comparison
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedForCompare([])}
                className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => navigate(`/compare?vehicles=${selectedForCompare.join(',')}`)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-950 flex items-center gap-1.5 transition-all"
              >
                Compare Selected Vehicles
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingVehicle(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-sky-400" />
              Edit Vehicle Listing
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update listing details for {editingVehicle.year} {editingVehicle.make} {editingVehicle.model} ({editingVehicle.registration_number}).
            </p>

            {/* Protected fields disclaimer */}
            <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3 mb-4 text-xs text-sky-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">System Record Protection:</span>
                Registration number ({editingVehicle.registration_number}) and VIN ({editingVehicle.vin}) are verified registry identifiers and cannot be modified.
              </div>
            </div>

            {editError && (
              <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl mb-4 text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Listed Price (₹ INR)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    placeholder="e.g. 1050000"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    value={editForm.current_odometer}
                    onChange={(e) => setEditForm(prev => ({ ...prev, current_odometer: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                    placeholder="e.g. 35000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Location / City</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    placeholder="e.g. Bhopal, Madhya Pradesh"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Exterior Color</label>
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    placeholder="e.g. Daytona Grey"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Fuel Mileage Efficiency (Optional)</label>
                <input
                  type="text"
                  value={editForm.mileage_efficiency}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mileage_efficiency: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  placeholder="e.g. 17.5 km/l ARAI"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Listing Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 resize-none"
                  placeholder="Provide details about condition, maintenance history, key accessories..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setDeletingVehicle(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl w-fit text-rose-400 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Remove Vehicle Listing?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to remove your listing for{' '}
              <strong className="text-slate-200">
                {deletingVehicle.year} {deletingVehicle.make} {deletingVehicle.model} ({deletingVehicle.registration_number})
              </strong>?
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-xs text-slate-300 leading-relaxed">
              <strong className="text-sky-400 block mb-0.5">Registry Integrity Guarantee:</strong>
              This action deactivates the marketplace listing. To maintain transparency, verified service logs, odometer checkpoints, and uploaded invoices remain archived in the CarTrust system.
            </div>

            {deleteError && (
              <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl mb-4 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                disabled={deletingLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVehicle}
                disabled={deletingLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                {deletingLoading ? 'Removing...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
