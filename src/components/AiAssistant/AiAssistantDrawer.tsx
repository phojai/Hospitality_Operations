import React, { useState, useEffect } from 'react';
import { Room, Booking, AiChatMessage } from '../../types';
import { Sparkles, Send, X, Bot, User, ArrowRight, RefreshCw, MessageSquare, Key, Settings2, Check } from 'lucide-react';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  bookings: Booking[];
  onAutoFillBooking: (prefill: { roomId?: string; checkIn?: string; checkOut?: string; guests?: number; guestName?: string; mobile?: string }) => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  rooms = [],
  bookings = [],
  onAutoFillBooking
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'm-1',
      sender: 'assistant',
      text: "Hello! I am your AI Homestay Reservation & Property Manager powered by Gemini 3.6 Flash. Ask me about room availability, pricing, or paste WhatsApp booking inquiries!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Gemini API key state (user custom key support)
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem('homestay_gemini_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>(customKey);
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);

  useEffect(() => {
    setTempKeyInput(customKey);
  }, [customKey]);

  const handleSaveCustomKey = () => {
    const trimmed = tempKeyInput.trim();
    setCustomKey(trimmed);
    localStorage.setItem('homestay_gemini_api_key', trimmed);
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setShowKeyInput(false); // Auto hide setup box once key is added/saved
    }, 800);
  };

  const handleClearKey = () => {
    setCustomKey('');
    setTempKeyInput('');
    localStorage.removeItem('homestay_gemini_api_key');
    setShowKeyInput(false);
  };

  if (!isOpen) return null;

  const quickPrompts = [
    {
      label: "🔍 Aug 10-14 Availability",
      prompt: "Check room availability for 4 guests from Aug 10 to Aug 14"
    },
    {
      label: "💬 Parse WhatsApp Inquiry",
      prompt: "Parse WhatsApp inquiry: 'Hi, I'm Sunita. Can I book Room 1 Ac Luxury for 2 guests from Aug 15 to Aug 18?'"
    },
    {
      label: "📊 Revenue & Occupancy Forecast",
      prompt: "What is our projected revenue and occupancy for this week?"
    }
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim()) return;

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          rooms,
          bookings,
          currentDate: new Date().toISOString().split('T')[0],
          apiKey: customKey.trim() || undefined
        })
      });

      const data = await res.json();

      const assistantMsg: AiChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || data.error || "Sorry, I couldn't generate a response.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Communication error: ${err.message || 'Server request failed'}. Please check your connection or API key setting.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 text-white flex flex-col border-b border-slate-800 gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <span>AI Reservation Manager</span>
                  {customKey && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">Custom Key Active</span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">Powered by Gemini 3.6 Flash</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {customKey ? (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Key Active
                </span>
              ) : (
                <button
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-[9px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium transition cursor-pointer"
                >
                  + Add Key
                </button>
              )}

              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`p-1.5 rounded-lg transition text-xs flex items-center gap-1 cursor-pointer ${showKeyInput ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700'}`}
                title="Configure Gemini API Key"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Key Input Banner - Only shown when user toggles key setup */}
          {showKeyInput && (
            <div className="p-3 bg-slate-800/95 rounded-2xl border border-slate-700/80 text-xs space-y-2 mt-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold text-[11px] flex items-center gap-1 text-amber-300">
                  <Key className="w-3.5 h-3.5" />
                  Gemini API Key Setup
                </span>
                {keySavedToast && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved & Hidden!
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Enter your Gemini API key below to power the AI assistant directly with your quota:
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tempKeyInput}
                  onChange={e => setTempKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveCustomKey()}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded-xl text-slate-100 font-mono outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={handleSaveCustomKey}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save
                </button>
                {customKey && (
                  <button
                    onClick={handleClearKey}
                    className="px-2.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-bold rounded-xl border border-rose-700 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-2 ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-br-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200 shadow-xs'
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                <span className="text-[9px] opacity-60 block text-right">{m.timestamp}</span>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  U
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 p-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Querying Gemini 3.6 Flash with room inventory...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts - Compact Horizontal Chip Bar */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
              Suggested:
            </span>
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q.prompt)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-700 hover:text-indigo-700 text-[11px] font-medium transition whitespace-nowrap cursor-pointer shrink-0 shadow-2xs"
                title={q.prompt}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask AI about availability, bookings, rates..."
            className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
