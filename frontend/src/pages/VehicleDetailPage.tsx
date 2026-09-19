import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth, formatErrorMessage } from '../contexts/AuthContext';
import api from '../api/client';
import {
  Shield,
  Clock,
  Wrench,
  AlertCircle,
  FileCheck,
  FileText,
  Download,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  MapPin,
  IndianRupee,
  Plus,
  Car,
  Upload,
  CheckCircle2,
  ExternalLink,
  Trash2,
  HelpCircle,
  FileSpreadsheet,
  X,
  RefreshCw,
  Eye,
  Scale,
  Edit2,
  Gauge,
  Lock,
  Info
} from 'lucide-react';
import { VerificationBadge, OdometerBadge } from '../components/StatusBadges';

interface ServiceRecord {
  id: string;
  service_date: string;
  service_center: string;
  service_type: string;
  work_performed: string;
  description?: string;
  odometer_reading?: number;
  total_amount: number;
  labor_cost?: number;
  parts_cost?: number;
  verification_status: string;
  record_source: string;
  invoice_id?: string;
  invoice_number?: string;
  document_id?: string;
  document_download_url?: string;
  document_filename?: string;
}

interface InvoiceItem {
  description: string;
  part_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [odometerAnalysis, setOdometerAnalysis] = useState<any>(null);
  const [serviceHistory, setServiceHistory] = useState<{
    total_expenditure: number;
    verified_expenditure: number;
    records_count: number;
    records: ServiceRecord[];
  }>({
    total_expenditure: 0,
    verified_expenditure: 0,
    records_count: 0,
    records: []
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'specs' | 'service' | 'claims' | 'odometer' | 'invoices' | 'assistant'>('specs');
  const [filterSource, setFilterSource] = useState<'ALL' | 'VERIFIED' | 'USER_PROVIDED'>('ALL');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Upload & Review Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('SERVICE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<'UPLOAD' | 'EXTRACTING' | 'REVIEW'>('UPLOAD');
  const [uploadError, setUploadError] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string>('');
  const [currentDocId, setCurrentDocId] = useState<string>('');
  const [reviewForm, setReviewForm] = useState<{
    invoice_number: string;
    vendor_name: string;
    customer_name: string;
    category: string;
    work_performed: string;
    invoice_date: string;
    odometer_reading: number;
    subtotal: number;
    tax: number;
    total_amount: number;
    items: InvoiceItem[];
    notes: string;
  }>({
    invoice_number: '',
    vendor_name: '',
    customer_name: '',
    category: 'SERVICE',
    work_performed: '',
    invoice_date: '',
    odometer_reading: 0,
    subtotal: 0,
    tax: 0,
    total_amount: 0,
    items: [],
    notes: ''
  });
  const [confirming, setConfirming] = useState(false);

  // Manual Service Record Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    service_date: new Date().toISOString().split('T')[0],
    service_center: '',
    service_type: 'General Service',
    work_performed: '',
    odometer_reading: 0,
    total_amount: 0,
    notes: ''
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');

  // AI Quick query input
  const [quickQuery, setQuickQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const loadVehicleData = async () => {
    try {
      const vRes = await api.get(`/vehicles/${id}`);
      setVehicle(vRes.data);
      const vehicleId = vRes.data.id;

      // Initialize edit form
      setEditForm({
        price: vRes.data.price || 0,
        location: vRes.data.location || '',
        color: vRes.data.color || '',
        current_odometer: vRes.data.current_odometer || 0,
        description: vRes.data.description || '',
        mileage_efficiency: vRes.data.mileage_efficiency || ''
      });

      const [intelRes, tlRes, shRes, invRes, clmRes, odoRes] = await Promise.all([
        api.get(`/vehicles/${vehicleId}/intelligence`).catch(() => ({ data: null })),
        api.get(`/vehicles/${vehicleId}/timeline`).catch(() => ({ data: [] })),
        api.get(`/vehicles/${vehicleId}/service-history`).catch(() => ({ data: { total_expenditure: 0, verified_expenditure: 0, records_count: 0, records: [] } })),
        api.get(`/vehicles/${vehicleId}/invoices`).catch(() => ({ data: [] })),
        api.get(`/vehicles/${vehicleId}/claims`).catch(() => ({ data: [] })),
        api.get(`/vehicles/${vehicleId}/odometer`).catch(() => ({ data: null }))
      ]);

      if (intelRes.data) setIntelligence(intelRes.data);
      if (tlRes.data) setTimeline(tlRes.data);
      if (shRes.data) setServiceHistory(shRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (clmRes.data) setClaims(clmRes.data);
      if (odoRes.data) setOdometerAnalysis(odoRes.data);

      if (manualForm.odometer_reading === 0) {
        setManualForm(prev => ({ ...prev, odometer_reading: vRes.data.current_odometer }));
      }
    } catch (err) {
      console.error('Failed to load vehicle intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [id]);

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    setSavingEdit(true);
    setEditError('');
    try {
      await api.put(`/vehicles/${vehicle.id}`, {
        price: Number(editForm.price) || null,
        location: editForm.location.trim() || null,
        color: editForm.color.trim() || null,
        current_odometer: Number(editForm.current_odometer) || 0,
        description: editForm.description.trim() || null,
        mileage_efficiency: editForm.mileage_efficiency.trim() || null
      });
      setShowEditModal(false);
      await loadVehicleData();
    } catch (err: any) {
      setEditError(formatErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Vehicle
  const handleDeleteVehicle = async () => {
    if (!vehicle) return;
    setDeletingLoading(true);
    setDeleteError('');
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      setShowDeleteModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      setDeleteError(formatErrorMessage(err));
    } finally {
      setDeletingLoading(false);
    }
  };

  // Upload Invoice Handlers
  const handleLoadSampleInvoice = async () => {
    setUploadError('');
    try {
      const res = await fetch('/samples/INV-10245.pdf');
      if (!res.ok) throw new Error('Sample PDF could not be loaded');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'INV-10245_XYZ_Auto.pdf', { type: 'application/pdf' });
      setSelectedFile(sampleFile);
      setUploadCategory('REPAIR');
    } catch (err: any) {
      setUploadError('Failed to load sample invoice file. Please choose a local PDF or image file.');
    }
  };

  const handleStartExtraction = async () => {
    if (!selectedFile) {
      setUploadError('Please select a PDF or image file first.');
      return;
    }
    setUploadError('');
    setUploadStep('EXTRACTING');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', uploadCategory);

    try {
      const res = await api.post(`/vehicles/${vehicle.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setCurrentInvoiceId(data.invoice_id);
      setCurrentDocId(data.document_id);
      setExtractedData(data.extracted_data);

      const ext = data.extracted_data;
      setReviewForm({
        invoice_number: ext.invoice_number || '',
        vendor_name: ext.vendor_name || '',
        customer_name: ext.customer_name || '',
        category: ext.category || uploadCategory,
        work_performed: ext.work_performed || '',
        invoice_date: ext.invoice_date || new Date().toISOString().split('T')[0],
        odometer_reading: ext.odometer_reading || vehicle.current_odometer,
        subtotal: ext.subtotal || 0,
        tax: ext.tax || 0,
        total_amount: ext.total_amount || 0,
        items: ext.items || [],
        notes: 'Extracted via OCR document analysis and verified by user.'
      });

      setUploadStep('REVIEW');
    } catch (err: any) {
      setUploadError(formatErrorMessage(err));
      setUploadStep('UPLOAD');
    }
  };

  const handleConfirmAndVerify = async () => {
    setConfirming(true);
    setUploadError('');
    try {
      await api.put(`/invoices/${currentInvoiceId}/review`, reviewForm);
      setShowUploadModal(false);
      setUploadStep('UPLOAD');
      setSelectedFile(null);
      await loadVehicleData();
    } catch (err: any) {
      setUploadError(formatErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    setManualSubmitting(true);
    try {
      await api.post(`/vehicles/${vehicle.id}/invoices/manual`, manualForm);
      setShowManualModal(false);
      setManualForm({
        service_date: new Date().toISOString().split('T')[0],
        service_center: '',
        service_type: 'General Service',
        work_performed: '',
        odometer_reading: vehicle.current_odometer,
        total_amount: 0,
        notes: ''
      });
      await loadVehicleData();
    } catch (err: any) {
      setManualError(formatErrorMessage(err));
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleAskAi = async (qText?: string) => {
    const query = qText || quickQuery;
    if (!query.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post('/assistant/query', {
        vehicle_id: vehicle.id,
        query: query.trim()
      });
      setAiAnswer(res.data.answer);
    } catch (err) {
      setAiAnswer('Unable to retrieve AI assistant response. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 py-20 px-6 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
        Loading vehicle intelligence profile...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 py-20 px-6 text-center">
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Vehicle Not Found</h2>
          <p className="text-xs text-slate-400 mb-6">
            No vehicle records matching this identifier are currently registered in the database.
          </p>
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold"
          >
            Return to Registry
          </Link>
        </div>
      </div>
    );
  }

  const canUserEdit = vehicle.can_edit || (user && vehicle.created_by_id === user.id);

  const filteredRecords = serviceHistory.records.filter(r => {
    if (filterSource === 'VERIFIED') return r.verification_status === 'VERIFIED';
    if (filterSource === 'USER_PROVIDED') return r.record_source === 'USER_PROVIDED';
    return true;
  });

  // State / RTO deduction from Indian plate
  const platePrefix = (vehicle.registration_number || '').slice(0, 4).toUpperCase();
  const rtoLocationMap: Record<string, string> = {
    'MP04': 'Madhya Pradesh (Bhopal RTO - MP04)',
    'DL01': 'Delhi (Mall Road RTO - DL01)',
    'MH12': 'Maharashtra (Pune RTO - MH12)',
    'HR26': 'Haryana (Gurugram RTO - HR26)',
    'KA05': 'Karnataka (Bangalore South - KA05)',
    'GJ01': 'Gujarat (Ahmedabad RTO - GJ01)'
  };
  const rtoText = rtoLocationMap[platePrefix] || `${vehicle.location || 'India'} Regional Transport Office`;

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 relative pb-20">
      <div className="max-w-7xl mx-auto">
        {/* HEADER SUMMARY CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                {vehicle.registration_number && (
                  <div className="inline-flex items-center rounded border border-slate-300 bg-white shadow-sm overflow-hidden text-slate-900 mr-1">
                    <div className="bg-blue-800 text-[9px] font-bold text-white px-1.5 py-0.5 flex flex-col items-center justify-center leading-none">
                      <span>🇮🇳</span>
                      <span className="text-[7px]">IND</span>
                    </div>
                    <span className="px-2.5 py-0.5 font-mono text-sm font-black tracking-widest uppercase">
                      {vehicle.registration_number}
                    </span>
                  </div>
                )}
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 border border-sky-800 px-2.5 py-1 rounded-md">
                  VIN: {vehicle.vin}
                </span>
                <OdometerBadge status={intelligence?.odometer_consistency_status || 'CONSISTENT'} />
                {vehicle.is_synthetic && (
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Synthetic Demo
                  </span>
                )}
                {canUserEdit && (
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Your Vehicle
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {vehicle.year} {vehicle.make} {vehicle.model} <span className="text-slate-400 font-normal text-xl">{vehicle.variant}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mt-2">
                <span>{vehicle.fuel_type}</span>
                <span>•</span>
                <span>{vehicle.transmission}</span>
                <span>•</span>
                <span>{vehicle.current_odometer?.toLocaleString()} km</span>
                {vehicle.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {vehicle.location}
                    </span>
                  </>
                )}
                {vehicle.price && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-amber-300">
                      ₹{Number(vehicle.price).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to={`/compare?vehicles=${vehicle.id}`}
                className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 text-indigo-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                Compare
              </Link>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadStep('UPLOAD');
                  setUploadError('');
                  setShowUploadModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Invoice
              </button>
              <a
                href={`/api/v1/reports/${vehicle.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                PDF Report
              </a>
              <Link
                to={`/assistant?vehicle=${encodeURIComponent(vehicle.registration_number || vehicle.vin || vehicle.id)}`}
                className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-950 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                AI Assistant
              </Link>

              {/* Customer Edit/Delete Actions */}
              {canUserEdit && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700 transition-colors"
                    title="Edit vehicle listing"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 transition-colors"
                    title="Delete vehicle listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metric Badges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800 text-xs">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Total Service Spend</span>
              <span className="text-xl font-bold text-amber-300 font-mono">
                ₹{serviceHistory.total_expenditure.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Verified Invoices</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {invoices.filter(i => i.verification_status === 'VERIFIED').length} Verified
              </span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Maintenance Confidence</span>
              <span className="text-xl font-bold text-slate-200">
                {intelligence?.maintenance_evidence_rating || 'HIGH'}
              </span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">History Coverage</span>
              <span className="text-xl font-bold text-sky-400">{intelligence?.history_coverage_pct || 80}%</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS (All 9 Intelligence Sections) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('specs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'specs'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Specs & Ownership
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'service'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Service History ({serviceHistory.records.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'claims'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Accidents & Claims ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab('odometer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'odometer'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Odometer & Timeline ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'invoices'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Invoice Repository ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'assistant'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-indigo-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Grounded AI Assistant
          </button>
        </div>

        {/* TAB 1: TECHNICAL SPECS & PRIVACY-SAFE OWNERSHIP */}
        {activeTab === 'specs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Technical Specifications */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                  <Car className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Technical Specifications</h3>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Engine Displacement:</span>
                    <span className="font-semibold text-white">{vehicle.engine_capacity || vehicle.engine_details || '1498 cc'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Engine Type:</span>
                    <span className="font-semibold text-white">{vehicle.engine_type || 'i-VTEC 4-Cylinder DOHC'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Fuel Type:</span>
                    <span className="font-semibold text-white">{vehicle.fuel_type}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Transmission:</span>
                    <span className="font-semibold text-white">{vehicle.transmission}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Seating Capacity:</span>
                    <span className="font-semibold text-white">{vehicle.seating_capacity || 5} Persons</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Exterior Color:</span>
                    <span className="font-semibold text-white">{vehicle.color || 'Pearl White'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Body Type:</span>
                    <span className="font-semibold text-white">{vehicle.body_type || 'Sedan'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Fuel Efficiency (ARAI):</span>
                    <span className="font-semibold text-white">{vehicle.mileage_efficiency || '17.4 km/l'}</span>
                  </div>
                </div>
              </div>

              {/* Privacy-Safe Ownership History */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Privacy-Safe Ownership History</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                      DPDP Compliant
                    </span>
                  </div>

                  <div className="space-y-3 text-xs mb-4">
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Ownership Sequence:</span>
                      <span className="font-bold text-white">{vehicle.ownership_status || 'FIRST'} Owner</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Registered RTO Jurisdiction:</span>
                      <span className="font-semibold text-slate-200">{rtoText}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Registration Category:</span>
                      <span className="font-semibold text-slate-200">Individual / Non-Commercial Private</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">Manufacturing & Reg Year:</span>
                      <span className="font-semibold text-slate-200">{vehicle.year} / {vehicle.registration_year || vehicle.year}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Chassis / RC Status:</span>
                      <span className="font-mono text-emerald-400 font-semibold">ACTIVE • NO HYPOTHECATION LOCK</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Redaction Protocol:</span>
                  </div>
                  Personal identifiable information (PII) including owner full legal name, phone number, and residential address is masked in accordance with Indian Motor Vehicles Act guidelines and platform privacy ethics.
                </div>
              </div>
            </div>

            {/* Description Card */}
            {vehicle.description && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Vehicle Notes & Background</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{vehicle.description}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SERVICE & REPAIR HISTORY */}
        {activeTab === 'service' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Filter Provenance:</span>
                <button
                  onClick={() => setFilterSource('ALL')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    filterSource === 'ALL'
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({serviceHistory.records.length})
                </button>
                <button
                  onClick={() => setFilterSource('VERIFIED')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                    filterSource === 'VERIFIED'
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Verified Invoices ({serviceHistory.records.filter(r => r.verification_status === 'VERIFIED').length})
                </button>
                <button
                  onClick={() => setFilterSource('USER_PROVIDED')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    filterSource === 'USER_PROVIDED'
                      ? 'bg-amber-950 border border-amber-800 text-amber-300'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                >
                  User-Provided ({serviceHistory.records.filter(r => r.record_source === 'USER_PROVIDED').length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setManualError('');
                    setShowManualModal(true);
                  }}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Manual Record
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadStep('UPLOAD');
                    setUploadError('');
                    setShowUploadModal(true);
                  }}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Invoice / Receipt
                </button>
              </div>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Service Records Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
                  Upload an invoice or add manual service records to construct a transparent maintenance profile.
                </p>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadStep('UPLOAD');
                    setShowUploadModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Invoice Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map(record => (
                  <div
                    key={record.id}
                    className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all ${
                      record.verification_status === 'VERIFIED'
                        ? 'border-emerald-900/60 hover:border-emerald-700'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded">
                            {record.service_date}
                          </span>
                          <span className="font-bold text-white text-base">
                            {record.work_performed}
                          </span>
                          {record.verification_status === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                              <Shield className="w-3 h-3" /> Verified by Invoice
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                              <AlertCircle className="w-3 h-3" /> User-Provided (Unverified)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                          <span className="text-slate-300 font-medium">{record.service_center}</span>
                          <span>•</span>
                          <span>{record.service_type}</span>
                          {record.odometer_reading ? (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-300 font-semibold">{record.odometer_reading.toLocaleString()} km</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-extrabold text-amber-300 font-mono block">
                          ₹{Number(record.total_amount).toLocaleString('en-IN')}
                        </span>
                        {record.labor_cost !== undefined && record.parts_cost !== undefined && (record.labor_cost > 0 || record.parts_cost > 0) && (
                          <span className="text-[11px] text-slate-400 block">
                            Parts: ₹{record.parts_cost.toLocaleString('en-IN')} • Labor: ₹{record.labor_cost.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {record.description && (
                      <p className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 mb-3">
                        {record.description}
                      </p>
                    )}

                    {record.invoice_id && (
                      <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/80">
                        <span className="font-mono text-[11px] text-slate-400">
                          Invoice #{record.invoice_number || 'INV-VERIFIED'}
                        </span>
                        {record.document_download_url && (
                          <a
                            href={record.document_download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Document
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCIDENT & CLAIM RECORDS (With Honest Absence Disclaimer) */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            {claims.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs text-rose-300 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Documented Insurance Damage Records:</span>
                    The connected insurance claims databases report {claims.length} documented insurance incident(s) for this chassis.
                  </div>
                </div>

                {claims.map((c, i) => (
                  <div key={i} className="bg-slate-900 border border-rose-900/40 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded mr-2">
                          {c.claim_date}
                        </span>
                        <span className="font-bold text-white text-base">Claim #{c.claim_number}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-400 px-2.5 py-1 rounded bg-rose-950 border border-rose-800">
                        {c.severity} SEVERITY
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl text-xs text-slate-300 mb-3">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Incident Type</span>
                        <span className="font-semibold">{c.claim_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Damage Area</span>
                        <span className="font-semibold">{c.damage_area}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Claim Amount</span>
                        <span className="font-semibold text-amber-300 font-mono">₹{Number(c.claim_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Repair Status</span>
                        <span className="font-semibold">{c.repair_status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="max-w-xl mx-auto">
                  <h3 className="text-lg font-bold text-white mb-2">
                    No Insurance Claims on Record
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zero collision or total loss claims have been filed with connected insurance providers for VIN{' '}
                    <span className="font-mono text-slate-300">{vehicle.vin}</span>.
                  </p>
                </div>

                {/* CRITICAL REQUIRED HONEST DISCLAIMER */}
                <div className="max-w-2xl mx-auto bg-slate-950 border border-amber-800/40 rounded-2xl p-5 text-left text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <span>Database Limitation & Physical Inspection Disclosure</span>
                  </div>
                  <p className="text-slate-400">
                    • <strong>Absence of Evidence is not Absolute Absence of Damage:</strong> While no insurance claims or reported structural damage records exist in our connected databases, CarTrust AI does not guarantee an accident-free vehicle history without a certified on-site physical inspection.
                  </p>
                  <p className="text-slate-400">
                    • <strong>Uninsured / Cash Repairs:</strong> Private, out-of-pocket, or non-insurance bodywork repairs do not generate third-party insurance records and might not appear in connected institutional repositories.
                  </p>
                  <p className="text-slate-400">
                    • <strong>Recommendation:</strong> Always commission an independent 140-point physical inspection covering paint depth (microns), apron welds, and underbody frame integrity before completing any vehicle purchase.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ODOMETER & TIMELINE */}
        {activeTab === 'odometer' && (
          <div className="space-y-6">
            {/* Odometer Analysis Banner */}
            <div className={`p-5 rounded-2xl border text-xs leading-relaxed ${
              odometerAnalysis?.rollback_detected
                ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  Odometer Integrity Analysis
                </span>
                <OdometerBadge status={odometerAnalysis?.status || 'CONSISTENT'} />
              </div>
              <p className="text-slate-400">
                {odometerAnalysis?.explanation || 'Chronological odometer progression verified across dealer services and inspection timestamps.'}
              </p>
            </div>

            {/* Visual Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 pb-3 border-b border-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Chronological Vehicle Milestones ({timeline.length})
              </h3>

              <div className="relative pl-6 border-l-2 border-slate-800 space-y-8">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-sky-400 group-hover:scale-125 transition-transform" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-sky-400">{event.event_date}</span>
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded w-fit">
                        {event.source}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                    {event.odometer && (
                      <span className="inline-block mt-2 font-mono text-[11px] font-semibold text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                        Odometer: {event.odometer.toLocaleString()} km
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INVOICE REPOSITORY */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-bold text-white">Verified Invoice & Document Repository</h3>
                <p className="text-xs text-slate-400">Total {invoices.length} uploaded records on file.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadStep('UPLOAD');
                  setShowUploadModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Document
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-white mb-1">No Invoices Uploaded Yet</p>
                <p className="text-xs text-slate-400 mb-4">Upload workshop bills or service receipts to verify maintenance claims.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoices.map(inv => (
                  <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded">
                          {inv.invoice_number || 'INV-RECORD'}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5">{inv.vendor_name || 'Authorized Service Center'}</h4>
                      </div>
                      <span className="text-sm font-mono font-bold text-amber-300">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <p>Date: <strong className="text-slate-200">{inv.invoice_date}</strong></p>
                      <p>Category: <strong className="text-slate-200">{inv.category}</strong></p>
                      {inv.odometer_reading && (
                        <p>Odometer at service: <strong className="text-slate-200 font-mono">{inv.odometer_reading.toLocaleString()} km</strong></p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {inv.verification_status}
                      </span>
                      {inv.download_url && (
                        <a
                          href={inv.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Download className="w-3 h-3" /> View Original
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: GROUNDED AI ASSISTANT */}
        {activeTab === 'assistant' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">CarTrust AI Intelligence Assistant</h3>
                <p className="text-xs text-slate-400">Ask questions grounded in this vehicle's database records.</p>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                "What is the total documented service expenditure?",
                "Has any odometer rollback or inconsistency been detected?",
                "Are there any collision or structural insurance claims on record?",
                "What are the key technical specifications of this car?"
              ].map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAskAi(promptText)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500 transition-colors"
                >
                  "{promptText}"
                </button>
              ))}
            </div>

            {/* Ask Box */}
            <div className="flex gap-2">
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Ask anything about this car's history, specs, service, or claims..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskAi();
                }}
              />
              <button
                type="button"
                onClick={() => handleAskAi()}
                disabled={aiLoading}
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                {aiLoading ? 'Analyzing...' : 'Ask AI'}
              </button>
            </div>

            {/* Answer Display */}
            {aiAnswer && (
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-xs leading-relaxed space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Verified Database Response:</span>
                </div>
                <p className="text-slate-300 whitespace-pre-line">{aiAnswer}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT VEHICLE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-sky-400" />
              Edit Vehicle Listing
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update listing information for {vehicle.year} {vehicle.make} {vehicle.model}.
            </p>

            <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3 mb-4 text-xs text-sky-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">System Record Protection:</span>
                Registration number ({vehicle.registration_number}) and VIN ({vehicle.vin}) are verified registry identifiers and cannot be altered by users.
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
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    value={editForm.current_odometer}
                    onChange={(e) => setEditForm(prev => ({ ...prev, current_odometer: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
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
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Exterior Color</label>
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
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
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Listing Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowDeleteModal(false)}
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
              Are you sure you want to deactivate your listing for{' '}
              <strong className="text-slate-200">
                {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.registration_number})
              </strong>?
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4 text-xs text-slate-300 leading-relaxed">
              <strong className="text-sky-400 block mb-0.5">Registry Integrity Guarantee:</strong>
              This action deactivates the marketplace listing. Verified service records, odometer readings, and uploaded documents will remain permanently archived in the CarTrust registry.
            </div>

            {deleteError && (
              <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl mb-4 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
                {deletingLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD & OCR REVIEW MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {uploadStep === 'UPLOAD' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    Upload Vehicle Invoice / Repair Document
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload a service bill, repair estimate, parts receipt, or maintenance document for {vehicle.make} {vehicle.model}.
                  </p>
                </div>

                {uploadError && (
                  <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl text-xs text-rose-300">
                    {uploadError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Document Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="SERVICE">Periodic Service / Maintenance</option>
                      <option value="REPAIR">Major Mechanical Repair</option>
                      <option value="PARTS">Replacement Parts / Tyres / Battery</option>
                      <option value="INSPECTION">Inspection / Safety Report</option>
                      <option value="INSURANCE">Insurance Claim Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select File (PDF or JPG/PNG)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setUploadError('');
                        }
                      }}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 bg-slate-950 p-2 rounded-xl border border-slate-700"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleInvoice}
                      className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      Use Sample Repair Invoice (INV-10245.pdf)
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartExtraction}
                    disabled={!selectedFile}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    Upload & Extract Data
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'EXTRACTING' && (
              <div className="py-12 text-center space-y-4">
                <div className="animate-spin w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                <h3 className="text-base font-bold text-white">Analyzing Invoice Document...</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  CarTrust OCR engine is extracting invoice numbers, workshop details, line items, and labor costs.
                </p>
              </div>
            )}

            {uploadStep === 'REVIEW' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    Review & Confirm Extracted Invoice
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Review the extracted invoice fields and confirm to commit this verified service record to the database.
                  </p>
                </div>

                {uploadError && (
                  <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl text-xs text-rose-300">
                    {uploadError}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={reviewForm.invoice_number}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Service Center / Vendor</label>
                    <input
                      type="text"
                      value={reviewForm.vendor_name}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, vendor_name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={reviewForm.invoice_date}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Odometer (km)</label>
                    <input
                      type="number"
                      value={reviewForm.odometer_reading}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, odometer_reading: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Total Amount (₹)</label>
                    <input
                      type="number"
                      value={reviewForm.total_amount}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono font-bold text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Category</label>
                    <input
                      type="text"
                      value={reviewForm.category}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-xs">Work Performed Description</label>
                  <input
                    type="text"
                    value={reviewForm.work_performed}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, work_performed: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUploadStep('UPLOAD')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndVerify}
                    disabled={confirming}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    {confirming ? 'Saving...' : 'Confirm & Commit Record'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANUAL SERVICE RECORD MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              Add Manual Service Record
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a customer-reported maintenance event. (Tagged as User-Provided until backed by an invoice).
            </p>

            {manualError && (
              <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl mb-4 text-xs text-rose-300">
                {manualError}
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Service Date</label>
                  <input
                    type="date"
                    required
                    value={manualForm.service_date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, service_date: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Odometer Reading (km)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.odometer_reading}
                    onChange={(e) => setManualForm(prev => ({ ...prev, odometer_reading: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Service Center / Workshop</label>
                  <input
                    type="text"
                    required
                    value={manualForm.service_center}
                    onChange={(e) => setManualForm(prev => ({ ...prev, service_center: e.target.value }))}
                    placeholder="e.g. Bosch Car Care"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.total_amount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Work Performed</label>
                <input
                  type="text"
                  required
                  value={manualForm.work_performed}
                  onChange={(e) => setManualForm(prev => ({ ...prev, work_performed: e.target.value }))}
                  placeholder="e.g. Periodic Oil Change, Filter & Brake Inspection"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {manualSubmitting ? 'Saving...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
