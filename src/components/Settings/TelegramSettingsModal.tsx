import React, { useState, useEffect } from 'react';
import { Send, Bot, CheckCircle2, AlertCircle, HelpCircle, X, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { getStoredTelegramConfig, saveStoredTelegramConfig, sendTestTelegramMessage } from '../../utils/telegramUtils';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramSettingsModal: React.FC<TelegramSettingsModalProps> = ({ isOpen, onClose }) => {
  const [botToken, setBotToken] = useState<string>('');
  const [chatId, setChatId] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredTelegramConfig();
      setBotToken(config.botToken);
      setChatId(config.chatId);
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredTelegramConfig({ botToken, chatId });
    setStatusMsg({
      type: 'success',
      text: 'Telegram credentials saved successfully! Housekeeping alerts will now be dispatched automatically on checkout.'
    });
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    setStatusMsg(null);

    // Save current state first
    saveStoredTelegramConfig({ botToken, chatId });

    const res = await sendTestTelegramMessage(botToken, chatId);
    setIsSendingTest(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
    } else {
      setStatusMsg({ type: 'error', text: res.message });
      setShowInstructions(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                Telegram Housekeeping Alerts
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </h3>
              <p className="text-xs text-slate-500">Auto-send housekeeping cleanup reminders on checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Message */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 text-rose-900 border border-rose-200'
                : 'bg-sky-50 text-sky-900 border border-sky-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Telegram Bot Token</span>
              <span className="text-[10px] font-normal text-slate-400">From @BotFather</span>
            </label>
            <input
              type="password"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono text-slate-800 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Housekeeping Chat / Group ID</span>
              <span className="text-[10px] font-semibold text-rose-600">Your User ID or Group ID (Not the Bot ID)</span>
            </label>
            <input
              type="text"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="e.g. 987654321 or -100123456789"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white font-mono text-slate-800 outline-none transition"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              <strong>Note:</strong> Enter <em>your personal Telegram Chat ID</em> (from <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-sky-700">@userinfobot</code>) or your group ID. Do <u>not</u> enter the bot's own ID.
            </p>
          </div>
        </div>

        {/* Toggle Instructions */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showInstructions ? 'Hide Setup Guide' : 'How to set up Telegram Bot & Chat ID?'}</span>
          </button>

          {showInstructions && (
            <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick 2-Minute Telegram Bot Setup:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px]">
                <li>
                  Open Telegram and search for <strong>@BotFather</strong>.
                </li>
                <li>
                  Send <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-slate-800">/newbot</code> and follow instructions to name your housekeeping bot.
                </li>
                <li>
                  Copy the <strong>HTTP API Token</strong> provided by BotFather and paste it above into <strong>Bot Token</strong>.
                </li>
                <li>
                  Start a chat with your bot or add it to your Housekeeping staff group chat.
                </li>
                <li>
                  Search for <strong>@userinfobot</strong> or <strong>@raw_data_bot</strong> in Telegram, send any message, and copy your numeric <strong>Chat ID</strong> (group IDs start with <code className="bg-white px-1 py-0.5 rounded border font-mono">-100</code>).
                </li>
                <li>Click <strong>Send Test Notification</strong> below to verify!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isSendingTest || !botToken || !chatId}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSendingTest ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : (
              <Send className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span>Send Test Alert</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
