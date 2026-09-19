import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  FileText,
  CheckCircle2,
  RotateCcw,
  Car,
  ExternalLink,
  Sparkles,
  Loader2,
  Calendar,
  Wrench,
  DollarSign
} from 'lucide-react';

interface VehicleOption {
  id: string;
  vin: string;
  registration_number?: string;
  make: string;
  model: string;
  year: number;
}

interface ActionItem {
  type: string;
  label: string;
  url?: string;
  target_id?: string;
}

interface EvidenceRef {
  source: string;
  date?: string;
  verification_status?: string;
  odometer?: number;
  total_amount?: number;
  claim_number?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  grounded_evidence?: EvidenceRef[];
  actions?: ActionItem[];
  suggested_questions?: string[];
  uncertainty_level?: 'KNOWN' | 'REPORTED' | 'INFERRED' | 'UNKNOWN';
}

export const AssistantPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicleParam = searchParams.get('vehicle') || 'MP04AB1234';

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleParam);
  const [activeVehicle, setActiveVehicle] = useState<VehicleOption | null>(null);

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'What is the current mileage?',
    'When was the last service?',
    'How much was spent on the last service?',
    'What parts have been replaced?',
    'Were the brakes replaced?',
    'Was the clutch replaced?',
    'Show me the invoices.'
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch available vehicles on mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await api.get('/vehicles');
        const list: VehicleOption[] = res.data.items || res.data || [];
        setVehicles(list);

        // Find initial vehicle matching query param or default
        const match = list.find(v =>
          v.registration_number?.toUpperCase() === vehicleParam.toUpperCase() ||
          v.vin?.toUpperCase() === vehicleParam.toUpperCase() ||
          v.id === vehicleParam
        );

        if (match) {
          setActiveVehicle(match);
          setSelectedVehicleId(match.registration_number || match.vin || match.id);
        } else if (list.length > 0) {
          setActiveVehicle(list[0]);
          setSelectedVehicleId(list[0].registration_number || list[0].vin || list[0].id);
        }
      } catch (err) {
        console.error('Failed to load vehicles for assistant', err);
      }
    };
    fetchVehicles();
  }, []);

  // Sync vehicle changes
  const handleVehicleChange = (newIdentifier: string) => {
    setSelectedVehicleId(newIdentifier);
    setSearchParams({ vehicle: newIdentifier });
    const matched = vehicles.find(v =>
      v.registration_number === newIdentifier ||
      v.vin === newIdentifier ||
      v.id === newIdentifier
    );
    if (matched) {
      setActiveVehicle(matched);
    }
    // Reset conversation greeting for the new vehicle
    const nameStr = matched
      ? `${matched.year} ${matched.make} ${matched.model} (${matched.registration_number || matched.vin})`
      : newIdentifier;

    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am your database-grounded intelligence assistant for ${nameStr}. Every response is backed strictly by stored CarTrust evidence. How can I help you inspect this vehicle?`,
        grounded_evidence: [],
        actions: [],
        suggested_questions: [
          'What is the current mileage?',
          'When was the last service?',
          'What parts have been replaced?',
          'Were the brakes replaced?',
          'Was the clutch replaced?',
          'Show me the invoices.',
          'Are there any accident records?'
        ],
        uncertainty_level: 'KNOWN'
      }
    ]);
    setSuggestions([
      'What is the current mileage?',
      'When was the last service?',
      'Were the brakes replaced?',
      'Show me the invoices.'
    ]);
  };

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const nameStr = activeVehicle
        ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.registration_number || activeVehicle.vin})`
        : selectedVehicleId;

      setMessages([
        {
          role: 'assistant',
          content: `Hello! I am your database-grounded intelligence assistant for ${nameStr}. Every answer is queried directly from verified maintenance logs, invoices, and inspection records. What would you like to verify?`,
          grounded_evidence: [],
          actions: [],
          suggested_questions: [
            'What is the current mileage?',
            'When was the last service?',
            'How much was spent on the last service?',
            'What parts have been replaced?',
            'Were the brakes replaced?',
            'Was the clutch replaced?',
            'Show me the invoices.'
          ],
          uncertainty_level: 'KNOWN'
        }
      ]);
    }
  }, [activeVehicle]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const newMsgs: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setQuery('');
    setLoading(true);

    try {
      const historyPayload = newMsgs.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.post('/assistant/query', {
        vehicle_id: selectedVehicleId,
        query: q,
        conversation_history: historyPayload
      });

      const data = res.data;
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        grounded_evidence: data.grounded_evidence || [],
        actions: data.actions || [],
        suggested_questions: data.suggested_questions || [],
        uncertainty_level: data.uncertainty_level || 'KNOWN'
      };

      setMessages([...newMsgs, assistantMsg]);

      if (data.suggested_questions && data.suggested_questions.length > 0) {
        setSuggestions(data.suggested_questions);
      }
    } catch (err: any) {
      console.error('Assistant error:', err);
      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          content: "I'm unable to retrieve the vehicle records right now. Please try again in a moment.",
          uncertainty_level: 'UNKNOWN'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const nameStr = activeVehicle
      ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.registration_number || activeVehicle.vin})`
      : selectedVehicleId;

    setMessages([
      {
        role: 'assistant',
        content: `Conversation reset. Ready to inspect database records for ${nameStr}.`,
        grounded_evidence: [],
        actions: [],
        uncertainty_level: 'KNOWN'
      }
    ]);
    setSuggestions([
      'What is the current mileage?',
      'When was the last service?',
      'What parts have been replaced?',
      'Were the brakes replaced?',
      'Was the clutch replaced?',
      'Show me the invoices.'
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col h-[820px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-950">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-base tracking-tight">CarTrust Grounded AI</h2>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  LIVE DATABASE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span>Vehicle Context:</span>
                <strong className="font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80 text-[11px]">
                  {activeVehicle?.registration_number || selectedVehicleId}
                </strong>
                {activeVehicle && (
                  <span className="text-slate-300 font-medium">
                    • {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Switcher & Clear Button */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <Car className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={selectedVehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer py-1 font-mono"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registration_number || v.vin} className="bg-slate-900 text-slate-200 font-sans">
                    {v.registration_number || v.vin} — {v.year} {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleClearChat}
              title="Clear conversation"
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[82%] p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-br-none shadow-lg shadow-sky-950'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none shadow-md'
                  }`}
                >
                  {/* Assistant Status Badge */}
                  {!isUser && m.uncertainty_level && (
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {m.uncertainty_level === 'KNOWN' ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified Database Evidence
                          </span>
                        ) : m.uncertainty_level === 'REPORTED' ? (
                          <span className="flex items-center gap-1 text-sky-400 font-semibold">
                            <HelpCircle className="w-3.5 h-3.5" /> User-Provided Record
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> No Verified Record Found
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Body formatted with paragraphs */}
                  <div className="whitespace-pre-line space-y-2">
                    {m.content}
                  </div>

                  {/* Clickable Action Buttons (View Invoice, View Service, View Report) */}
                  {!isUser && m.actions && m.actions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/90 flex flex-wrap gap-2">
                      {m.actions.map((act, aIdx) => (
                        <a
                          key={aIdx}
                          href={act.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-950 hover:bg-sky-900 border border-sky-700 text-sky-200 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                        >
                          {act.type === 'view_invoice' && <FileText className="w-3.5 h-3.5 text-sky-400" />}
                          {act.type === 'view_service' && <Wrench className="w-3.5 h-3.5 text-emerald-400" />}
                          {act.type === 'view_report' && <ExternalLink className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{act.label}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Supporting Provenance References */}
                  {!isUser && m.grounded_evidence && m.grounded_evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400 space-y-1.5">
                      <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider">
                        Documented Sources:
                      </span>
                      {m.grounded_evidence.map((ev, i) => (
                        <div key={i} className="flex items-center gap-2 font-mono text-[11px] text-sky-300 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {ev.source} {ev.date ? `(${ev.date})` : ''} — <strong className="text-slate-200">{ev.verification_status || 'VERIFIED'}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Searching Database Indicator */}
          {loading && (
            <div className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl max-w-sm text-xs text-slate-300 animate-pulse">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <span>Searching vehicle records in CarTrust database...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Suggested Questions Bar */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Suggested:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {suggestions.slice(0, 4).map((sug, sIdx) => (
                <button
                  key={sIdx}
                  disabled={loading}
                  onClick={() => handleSend(sug)}
                  className="px-3 py-1 bg-slate-800/90 hover:bg-slate-700 text-sky-200 hover:text-white rounded-full border border-slate-700 transition-colors shrink-0 text-xs text-left"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask about ${activeVehicle?.registration_number || selectedVehicleId} (e.g., last service, brakes, invoices, 2023 mileage)...`}
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-3 rounded-2xl transition-colors shadow-lg shadow-sky-950 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
