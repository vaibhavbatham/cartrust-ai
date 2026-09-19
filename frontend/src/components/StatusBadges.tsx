import React from 'react';
import { CheckCircle, AlertTriangle, HelpCircle, XCircle, ShieldCheck, Clock } from 'lucide-react';

export const VerificationBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status?.toUpperCase()) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified
        </span>
      );
    case 'PARTIALLY_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          Partially Verified
        </span>
      );
    case 'DOCUMENT_CHECKED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
          <Clock className="w-3.5 h-3.5" />
          Document Checked
        </span>
      );
    case 'INCONSISTENT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">
          <XCircle className="w-3.5 h-3.5" />
          Inconsistent
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <HelpCircle className="w-3.5 h-3.5" />
          Unverified
        </span>
      );
  }
};

export const OdometerBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'CONSISTENT') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
        <CheckCircle className="w-3.5 h-3.5" />
        No Rollback Detected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
      <AlertTriangle className="w-3.5 h-3.5" />
      Rollback Inconsistency Suspected
    </span>
  );
};
