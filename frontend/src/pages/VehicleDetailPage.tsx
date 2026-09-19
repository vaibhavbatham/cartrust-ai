import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Eye
} from 'lucide-react';
import { VerificationBadge, OdometerBadge } from '../components/StatusBadges';
import { formatErrorMessage } from '../contexts/AuthContext';

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
  const [vehicle, setVehicle] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
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
  const [activeTab, setActiveTab] = useState<'service' | 'timeline' | 'invoices'>('service');
  const [filterSource, setFilterSource] = useState<'ALL' | 'VERIFIED' | 'USER_PROVIDED'>('ALL');

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

  const loadVehicleData = async () => {
    try {
      const vRes = await api.get(`/vehicles/${id}`);
      setVehicle(vRes.data);
      const vehicleId = vRes.data.id;

      const [intelRes, tlRes, shRes, invRes] = await Promise.all([
        api.get(`/vehicles/${vehicleId}/intelligence`),
        api.get(`/vehicles/${vehicleId}/timeline`),
        api.get(`/vehicles/${vehicleId}/service-history`),
        api.get(`/vehicles/${vehicleId}/invoices`)
      ]);

      setIntelligence(intelRes.data);
      setTimeline(tlRes.data);
      setServiceHistory(shRes.data);
      setInvoices(invRes.data);
      if (manualForm.odometer_reading === 0) {
        setManualForm(prev => ({ ...prev, odometer_reading: vRes.data.current_odometer }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [id]);

  // Load realistic sample invoice
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

  // Submit invoice upload to backend for OCR extraction
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

  // Update item in review form
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...reviewForm.items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? Number(value) : updated[index].quantity;
      const p = field === 'unit_price' ? Number(value) : updated[index].unit_price;
      updated[index].total_price = Number((q * p).toFixed(2));
    }
    const newSubtotal = updated.reduce((sum, itm) => sum + (itm.total_price || 0), 0);
    const newTotal = Number((newSubtotal + reviewForm.tax).toFixed(2));
    setReviewForm(prev => ({
      ...prev,
      items: updated,
      subtotal: newSubtotal,
      total_amount: newTotal
    }));
  };

  const handleAddItem = () => {
    setReviewForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: 'Additional Service Item', quantity: 1, unit_price: 1000, total_price: 1000 }
      ],
      subtotal: prev.subtotal + 1000,
      total_amount: prev.total_amount + 1000
    }));
  };

  const handleRemoveItem = (index: number) => {
    const itm = reviewForm.items[index];
    const updated = reviewForm.items.filter((_, i) => i !== index);
    const newSubtotal = Math.max(0, reviewForm.subtotal - (itm.total_price || 0));
    setReviewForm(prev => ({
      ...prev,
      items: updated,
      subtotal: newSubtotal,
      total_amount: Number((newSubtotal + prev.tax).toFixed(2))
    }));
  };

  // Confirm and verify invoice
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

  // Handle manual service record submission
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

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-12 text-center text-slate-400">Loading Vehicle Intelligence Profile...</div>;
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 bg-amber-950/80 border border-amber-800/80 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Vehicle Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">
            No vehicle found with number plate or VIN: <span className="text-amber-300 font-mono font-bold">{id}</span>.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to={`/vehicles/add`}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-950"
            >
              <Plus className="w-4 h-4" /> Add This Vehicle to CarTrust
            </Link>
            <Link
              to="/dashboard"
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-sm border border-slate-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredRecords = serviceHistory.records.filter(r => {
    if (filterSource === 'VERIFIED') return r.verification_status === 'VERIFIED';
    if (filterSource === 'USER_PROVIDED') return r.record_source === 'USER_PROVIDED';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Summary Card */}
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadStep('UPLOAD');
                  setUploadError('');
                  setShowUploadModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Invoice
              </button>
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
              <span className="text-slate-400 block mb-1">Total Service Spend</span>
              <span className="text-xl font-bold text-amber-300">
                ₹{serviceHistory.total_expenditure.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Verified Invoices</span>
              <span className="text-xl font-bold text-emerald-400">
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('service')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'service'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Service & Repair History ({serviceHistory.records.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Historical Timeline ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'invoices'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Supporting Invoices ({invoices.length})
          </button>
        </div>

        {/* TAB 1: Service & Repair History */}
        {activeTab === 'service' && (
          <div className="space-y-6">
            {/* Action Bar & Filter */}
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
                          {record.odometer_reading && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-300">{record.odometer_reading.toLocaleString()} km</span>
                            </>
                          )}
                          {record.invoice_number && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-sky-400 font-semibold">#{record.invoice_number}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2">
                        <div className="text-lg font-bold text-amber-300">
                          ₹{record.total_amount.toLocaleString('en-IN')}
                        </div>
                        {record.document_download_url && (
                          <a
                            href={record.document_download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-950/70 border border-sky-800/80 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Download className="w-3 h-3" /> View Original Invoice
                          </a>
                        )}
                      </div>
                    </div>

                    {record.description && (
                      <p className="text-xs text-slate-400 mt-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                        {record.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Historical Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Chronological Provenance Milestones ({timeline.length})
              </h2>
            </div>
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
        )}

        {/* TAB 3: Supporting Invoices */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                Uploaded Vehicle Invoices & Financial Proofs ({invoices.length})
              </h2>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setUploadStep('UPLOAD');
                  setShowUploadModal(true);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload New Invoice
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No invoices recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoices.map(inv => (
                  <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 border border-sky-800 px-2 py-0.5 rounded">
                          {inv.invoice_number}
                        </span>
                        <VerificationBadge status={inv.verification_status} />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{inv.vendor_name}</h4>
                      <p className="text-xs text-slate-400 mb-3">{inv.work_performed || inv.category}</p>
                      <div className="text-xs text-slate-400 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span className="text-slate-200">{inv.invoice_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recorded Odometer:</span>
                          <span className="text-slate-200">{inv.odometer_reading ? `${inv.odometer_reading.toLocaleString()} km` : '-'}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                          <span className="text-slate-300">Total:</span>
                          <span className="text-amber-300">₹{inv.total_amount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                      {inv.document?.download_url && (
                        <a
                          href={inv.document.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full text-center bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 rounded-xl text-sky-400 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Original Document
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: Upload & OCR Review Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {uploadStep === 'UPLOAD' && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Upload Vehicle Invoice / Repair Document</h2>
                      <p className="text-xs text-slate-400">PDF, JPG, or PNG files accepted</p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="mt-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="space-y-4 mt-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Document Category
                      </label>
                      <select
                        value={uploadCategory}
                        onChange={e => setUploadCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                      >
                        <option value="SERVICE">Servicing (Scheduled Maintenance, Oil & Filter)</option>
                        <option value="REPAIR">Repairs (Mechanical, Electrical, Brakes, Suspension)</option>
                        <option value="PARTS">Replacement Parts & Accessories</option>
                        <option value="MAINTENANCE">General Maintenance & Inspection</option>
                        <option value="PURCHASE">Vehicle Purchase Invoice / Delivery Challan</option>
                        <option value="INSURANCE">Insurance Policy or Claim Document</option>
                        <option value="OTHER">Other Automotive Expense</option>
                      </select>
                    </div>

                    <div className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-6 text-center bg-slate-950/50 transition-colors">
                      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <div className="text-xs font-semibold text-slate-300 mb-1">
                        {selectedFile ? (
                          <span className="text-emerald-400 font-bold">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                        ) : (
                          "Choose a PDF or Image file from your device"
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-4">Supported: PDF, JPG, PNG (Max 10 MB)</p>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        id="invoice-file-input"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />
                      <label
                        htmlFor="invoice-file-input"
                        className="cursor-pointer inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-colors"
                      >
                        Browse Files
                      </label>
                    </div>

                    {/* Quick Demo Sample Button */}
                    <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                          <span>✨ Test with Sample Invoice (INV-10245)</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          XYZ Auto Service • Brake Pads & Oil (₹13,570)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoadSampleInvoice}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        Load Sample
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFile}
                      onClick={handleStartExtraction}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Upload & Run OCR Extraction
                    </button>
                  </div>
                </div>
              )}

              {uploadStep === 'EXTRACTING' && (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-sky-950 border border-sky-800 text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-spin">
                    <RefreshCw className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Analyzing Document with OCR</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Extracting invoice number, line items, service center, date, and odometer readings...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
                    <span>Status: Extracting Structured Data</span>
                  </div>
                </div>
              )}

              {uploadStep === 'REVIEW' && (
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950 border border-amber-800 px-2.5 py-0.5 rounded-full mb-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Verification Step: Review Extracted Details
                      </div>
                      <h2 className="text-xl font-bold text-white">Review & Edit Extracted Information</h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    OCR can occasionally make transcription errors. Please inspect the values extracted below and make any necessary corrections before confirming.
                  </p>

                  {uploadError && (
                    <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Invoice Number <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={reviewForm.invoice_number}
                          onChange={e => setReviewForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Invoice Date <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          value={reviewForm.invoice_date}
                          onChange={e => setReviewForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Service Center / Vendor <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={reviewForm.vendor_name}
                          onChange={e => setReviewForm(prev => ({ ...prev, vendor_name: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Odometer Reading (km)
                        </label>
                        <input
                          type="number"
                          value={reviewForm.odometer_reading}
                          onChange={e => setReviewForm(prev => ({ ...prev, odometer_reading: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Work Performed Summary
                        </label>
                        <input
                          type="text"
                          value={reviewForm.work_performed}
                          onChange={e => setReviewForm(prev => ({ ...prev, work_performed: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-300">
                          Extracted Line Items ({reviewForm.items.length})
                        </label>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>

                      <div className="border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">Description</th>
                              <th className="p-2.5 w-16 text-center">Qty</th>
                              <th className="p-2.5 w-24 text-right">Price (₹)</th>
                              <th className="p-2.5 w-24 text-right">Total (₹)</th>
                              <th className="p-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {reviewForm.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-950/50">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                    className="w-full bg-transparent text-slate-200 focus:outline-none border-b border-transparent focus:border-sky-500 text-xs"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                    className="w-full bg-transparent text-slate-200 text-center focus:outline-none border-b border-transparent focus:border-sky-500 text-xs"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.unit_price}
                                    onChange={e => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                                    className="w-full bg-transparent text-slate-200 text-right focus:outline-none border-b border-transparent focus:border-sky-500 text-xs font-mono"
                                  />
                                </td>
                                <td className="p-2 text-right font-mono font-semibold text-slate-200">
                                  ₹{item.total_price.toLocaleString('en-IN')}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="text-slate-500 hover:text-rose-400 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span className="font-mono text-slate-200">₹{reviewForm.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>GST / Taxes:</span>
                        <span className="font-mono text-slate-200">₹{reviewForm.tax.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                        <span>Grand Total:</span>
                        <span className="font-mono text-amber-300">₹{reviewForm.total_amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setUploadStep('UPLOAD')}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={confirming}
                      onClick={handleConfirmAndVerify}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {confirming ? "Verifying..." : "Confirm & Verify Invoice"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: Manual Service Record Modal */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
              <button
                onClick={() => setShowManualModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-950 border border-amber-800 text-amber-400 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add Manual Service Record</h2>
                  <p className="text-xs text-amber-400">Self-reported without invoice proof (Marked as User-Provided)</p>
                </div>
              </div>

              {manualError && (
                <div className="mt-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={manualForm.service_date}
                    onChange={e => setManualForm(prev => ({ ...prev, service_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Center / Workshop <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City Auto Garage"
                    value={manualForm.service_center}
                    onChange={e => setManualForm(prev => ({ ...prev, service_center: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Odometer (km) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={manualForm.odometer_reading}
                      onChange={e => setManualForm(prev => ({ ...prev, odometer_reading: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Total Spend (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={manualForm.total_amount}
                      onChange={e => setManualForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Work Performed <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine Oil + Oil Filter + General Inspection"
                    value={manualForm.work_performed}
                    onChange={e => setManualForm(prev => ({ ...prev, work_performed: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    value={manualForm.notes}
                    onChange={e => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Paid cash, regular scheduled oil change"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors"
                  >
                    {manualSubmitting ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
