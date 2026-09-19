import React, { useState } from 'react';
import api from '../api/client';
import { Upload, FileText, CheckCircle2, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { VerificationBadge } from '../components/StatusBadges';

export const UploadPage: React.FC = () => {
  const [vin, setVin] = useState('DEMO-VIN-HC-2019-001');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF or image invoice file');
      return;
    }
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/vehicles/${vin}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Document processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWithIssuer = async () => {
    if (!uploadResult?.invoice_id) return;
    setVerifying(true);
    try {
      const res = await api.post(`/invoices/${uploadResult.invoice_id}/verify-issuer`);
      setVerifyResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Issuer verification query failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Upload Maintenance Invoice</h1>
        <p className="text-sm text-slate-400 mb-8">
          Upload PDF service receipts. Our parser extracts item details and compares against independent issuer service systems.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Vehicle Identifier</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Select Invoice (PDF or Image)</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-300 hover:file:bg-slate-700"
              />
            </div>

            {error && (
              <div className="p-3 text-xs font-semibold rounded-lg bg-rose-950 border border-rose-800 text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Processing Document & OCR...' : 'Process Document'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* OCR Result Card */}
        {uploadResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                OCR Extracted Invoice Data
              </h2>
              <VerificationBadge status={verifyResult?.verification_status || uploadResult.verification_status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Invoice Number</span>
                <span className="text-sm font-mono font-bold text-white">{uploadResult.invoice_number}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Vendor</span>
                <span className="text-sm font-semibold text-white">{uploadResult.vendor}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Reported Mileage</span>
                <span className="text-sm font-mono font-bold text-white">{uploadResult.odometer?.toLocaleString()} km</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Total Amount</span>
                <span className="text-sm font-bold text-emerald-400">₹{uploadResult.total_amount?.toLocaleString()}</span>
              </div>
            </div>

            {/* Independent Vendor Confirmation CTA */}
            {!verifyResult ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-sky-900/60">
                <p className="text-xs text-slate-300 mb-3">
                  <strong>Verification Principle:</strong> OCR extraction establishes what the paper states, but does not prove authenticity. Verify against issuer gateway to establish independent confirmation.
                </p>
                <button
                  onClick={handleVerifyWithIssuer}
                  disabled={verifying}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {verifying ? 'Querying Issuer Gateway...' : 'Verify with Simulated Issuer API'}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-800 text-xs">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Issuer Gateway Confirmed: Status upgraded to VERIFIED
                </h4>
                <p className="text-slate-300">{verifyResult.issuer_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
