import React, { useState } from 'react';
import api from '../api/client';
import { MessageSquare, Send, ShieldCheck, HelpCircle, AlertTriangle } from 'lucide-react';

export const AssistantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [vehicleId, setVehicleId] = useState('DEMO-VIN-HC-2019-001');
  const [messages, setMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: 'Hello! I am the CarTrust Grounded AI Assistant. I answer questions strictly from verifiable records and never speculate on unrecorded repairs.',
      grounded_evidence: [],
      uncertainty_level: 'KNOWN'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/assistant/query', {
        vehicle_id: vehicleId,
        query: q
      });
      setMessages([...newMsgs, {
        role: 'assistant',
        content: res.data.answer,
        grounded_evidence: res.data.grounded_evidence,
        uncertainty_level: res.data.uncertainty_level
      }]);
    } catch (err) {
      setMessages([...newMsgs, {
        role: 'assistant',
        content: 'Error communicating with assistant. Please verify backend connection.',
        uncertainty_level: 'UNKNOWN'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-6">
      <div className="max-w-4xl mx-auto flex flex-col h-[750px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-600 text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">CarTrust AI Assistant</h2>
              <span className="text-xs text-slate-400">Context: <strong className="font-mono text-sky-400">{vehicleId}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Preset queries:</span>
            <button
              onClick={() => handleSend('Has the brake system been serviced?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded border border-slate-700"
            >
              Check Brakes
            </button>
            <button
              onClick={() => handleSend('Has the clutch been replaced?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700"
            >
              Check Clutch (Unrecorded)
            </button>
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
              >
                {m.content}

                {m.grounded_evidence && m.grounded_evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-300 block">Supporting Provenance:</span>
                    {m.grounded_evidence.map((ev: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 font-mono text-[11px] text-sky-300">
                        <span>• {ev.source} ({ev.date}) — Status: {ev.verification_status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-xs text-slate-500 italic">Consulting grounded vehicle evidence...</div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about accidents, brake servicing, odometer consistency..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
