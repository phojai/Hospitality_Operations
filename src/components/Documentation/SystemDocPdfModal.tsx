import React, { useState } from 'react';
import { FileText, Download, X, Layers, Cpu, Database, Server, Bot, Workflow, CheckCircle, ArrowRight, ShieldCheck, Sparkles, RefreshCw, Building2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SystemDocPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDocPdfModal: React.FC<SystemDocPdfModalProps> = ({ isOpen, onClose }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const generatePDF = () => {
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      let y = 15;

      // Helper for page headers
      const addHeader = (title: string, subtitle?: string) => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('Nohshring Homestay Management System', 12, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(52, 211, 153); // emerald-400
        doc.text(title + (subtitle ? ` | ${subtitle}` : ''), 12, 19);

        // Date right top
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`, pageWidth - 12, 12, { align: 'right' });

        y = 35;
      };

      const addFooter = (pageNum: number, totalPages: number) => {
        doc.setDrawColor(226, 232, 240);
        doc.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Nohshring Homestay PMS — Architecture & Tech Documentation', 12, pageHeight - 7);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 12, pageHeight - 7, { align: 'right' });
      };

      // ==========================================
      // PAGE 1: System Overview & Tech Stack
      // ==========================================
      addHeader('Technical Stack & Architecture Specification', 'Overview');

      // Executive Summary Box
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(12, y, pageWidth - 24, 22, 3, 3, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Executive Summary', 16, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const summaryLines = doc.splitTextToSize(
        'Nohshring Homestay is a full-stack, enterprise-grade Multi-Tenant Property Management System (PMS). It integrates multi-property location switching (propertyId tenancy scoping), multi-room matrix reservations, itemized check-out bill adjustments (Cash & Online modes), real-time Cloud Firestore synchronization, automated Telegram housekeeping reminders, and an interactive Gemini 2.5 Flash AI reservation assistant.',
        pageWidth - 32
      );
      doc.text(summaryLines, 16, y + 13);

      y += 28;

      // Tech Stack Table / Cards Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Technology Stack Breakdown', 12, y);
      y += 6;

      const techStackItems = [
        {
          category: 'Frontend Client Layer',
          color: [14, 165, 233], // sky-500
          techs: 'React 19 (TypeScript), Tailwind CSS v4, Lucide React Icons, Motion Animation Engine, Recharts Analytics.'
        },
        {
          category: 'Multi-Tenant Architecture',
          color: [245, 158, 11], // amber-500
          techs: 'Isolated Property Tenancy (propertyId schema scoping) supporting multiple homestay locations with dedicated inventories.'
        },
        {
          category: 'Backend Application Server',
          color: [79, 70, 229], // indigo-600
          techs: 'Node.js runtime with Express v4 application proxy server (running on Cloud Run container at port 3000).'
        },
        {
          category: 'Database & Cloud Persistence',
          color: [16, 185, 129], // emerald-500
          techs: 'Google Cloud Firestore (Firebase v12 SDK) for multi-tenant live sync across Properties, Rooms, Bookings & Guests.'
        },
        {
          category: 'Bill Settlement & Invoicing',
          color: [225, 29, 72], // rose-600
          techs: 'Automated Balance Bill calculation & check-out settlement popup with 1. Cash and 2. Online payment modes.'
        },
        {
          category: 'Housekeeping & AI Assistant',
          color: [147, 51, 234], // purple-600
          techs: 'Telegram Bot API for instant checkout cleaning alerts & Gemini 2.5 Flash model (@google/genai SDK) for AI queries.'
        }
      ];

      techStackItems.forEach(item => {
        // Color bar
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.rect(12, y, 3, 14, 'F');

        // Card bg
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, pageWidth - 27, 14, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(item.category, 19, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitTechs = doc.splitTextToSize(item.techs, pageWidth - 35);
        doc.text(splitTechs, 19, y + 10);

        y += 17;
      });

      y += 4;

      // System Architecture Diagram
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('2. High-Level Architecture Diagram', 12, y);
      y += 6;

      // Draw diagram boxes
      const boxWidth = 52;
      const boxHeight = 28;

      // Box 1: Client Browser
      doc.setFillColor(239, 246, 255); // blue-50
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(12, y, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('CLIENT LAYER', 16, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('• React 19 SPA', 16, y + 12);
      doc.text('• State Engine (Hooks)', 16, y + 17);
      doc.text('• Local Storage Sync', 16, y + 22);

      // Arrow 1 -> 2
      doc.setDrawColor(100, 116, 139);
      doc.line(12 + boxWidth, y + 14, 12 + boxWidth + 12, y + 14);
      doc.triangle(12 + boxWidth + 12, y + 14, 12 + boxWidth + 9, y + 12, 12 + boxWidth + 9, y + 16, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('REST / HTTP', 12 + boxWidth + 1, y + 11);

      // Box 2: Express Server
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(12 + boxWidth + 12, y, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 83, 45);
      doc.text('EXPRESS BACKEND', 12 + boxWidth + 16, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('• /api/telegram/send', 12 + boxWidth + 16, y + 12);
      doc.text('• /api/db File Sync', 12 + boxWidth + 16, y + 17);
      doc.text('• /api/ai Chat Proxy', 12 + boxWidth + 16, y + 22);

      // Arrow 2 -> 3
      doc.setDrawColor(100, 116, 139);
      doc.line(12 + (boxWidth * 2) + 12, y + 14, 12 + (boxWidth * 2) + 24, y + 14);
      doc.triangle(12 + (boxWidth * 2) + 24, y + 14, 12 + (boxWidth * 2) + 21, y + 12, 12 + (boxWidth * 2) + 21, y + 16, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('HTTPS API', 12 + (boxWidth * 2) + 13, y + 11);

      // Box 3: External Cloud APIs
      doc.setFillColor(250, 245, 255); // purple-50
      doc.setDrawColor(233, 213, 255);
      doc.roundedRect(12 + (boxWidth * 2) + 24, y, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(88, 28, 135);
      doc.text('CLOUD SERVICES', 12 + (boxWidth * 2) + 28, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('• Google Cloud Firestore', 12 + (boxWidth * 2) + 28, y + 12);
      doc.text('• Telegram Bot API', 12 + (boxWidth * 2) + 28, y + 17);
      doc.text('• Gemini 2.5 Flash API', 12 + (boxWidth * 2) + 28, y + 22);

      addFooter(1, 2);

      // ==========================================
      // PAGE 2: Detailed Flowcharts
      // ==========================================
      doc.addPage();
      addHeader('Application Flowcharts & Sequence Diagrams', 'Process Flows');

      y = 35;

      // FLOWCHART 1: Housekeeping Checkout Flow
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Flowchart 1: Guest Check-out & Telegram Housekeeping Reminder', 12, y);
      y += 6;

      const checkoutSteps = [
        { label: '1. Receptionist clicks "Check-Out" on active booking', sub: 'Triggers Guest Check-Out & Bill Settlement Modal' },
        { label: '2. Staff reviews Balance Bill & selects Payment Mode', sub: 'Adjusts remaining balance via 1. CASH or 2. ONLINE (UPI/GPay/Card)' },
        { label: '3. React updates status to "checked_out" & paymentStatus to "Paid"', sub: 'Recalculates occupancy & triggers Cloud Firestore sync' },
        { label: '4. Express proxy endpoint POST /api/telegram/send is invoked', sub: 'Transmits credentials safely using server-side proxy' },
        { label: '5. Telegram Bot API delivers HTML message to Housekeeping Chat', sub: 'Instant cleaning alert delivered to staff smartphones' }
      ];

      checkoutSteps.forEach((st, idx) => {
        doc.setFillColor(224, 242, 254); // sky-100
        doc.setDrawColor(56, 189, 248);
        doc.roundedRect(12, y, pageWidth - 24, 11, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(12, 74, 110);
        doc.text(st.label, 16, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(st.sub, 16, y + 8.5);

        y += 11;

        if (idx < checkoutSteps.length - 1) {
          // Draw down arrow
          doc.setDrawColor(148, 163, 184);
          doc.line(pageWidth / 2, y, pageWidth / 2, y + 3);
          doc.triangle(pageWidth / 2, y + 3, pageWidth / 2 - 1.5, y + 1.5, pageWidth / 2 + 1.5, y + 1.5, 'F');
          y += 3.5;
        }
      });

      y += 6;

      // FLOWCHART 2: Data Persistence & Firestore Sync Flow
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Flowchart 2: Booking Lifecycle & Cloud Firestore Persistence', 12, y);
      y += 6;

      const persistenceSteps = [
        { label: '1. User creates or modifies booking / guest profile', sub: 'Data validation (room collision check & mandatory fields)' },
        { label: '2. Synchronous UI State Update', sub: 'Instant UI re-render with zero latency for smooth user experience' },
        { label: '3. Cloud Firestore Collection Write', sub: 'Writes sanitized JSON payload to "rooms", "bookings", and "guests" collections' },
        { label: '4. Offline LocalStorage & Server Sync', sub: 'Saves fallback cache in browser & POST /api/db for server file backup' }
      ];

      persistenceSteps.forEach((st, idx) => {
        doc.setFillColor(236, 253, 245); // emerald-50
        doc.setDrawColor(52, 211, 153);
        doc.roundedRect(12, y, pageWidth - 24, 11, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(6, 78, 59);
        doc.text(st.label, 16, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(st.sub, 16, y + 8.5);

        y += 11;

        if (idx < persistenceSteps.length - 1) {
          doc.setDrawColor(148, 163, 184);
          doc.line(pageWidth / 2, y, pageWidth / 2, y + 3);
          doc.triangle(pageWidth / 2, y + 3, pageWidth / 2 - 1.5, y + 1.5, pageWidth / 2 + 1.5, y + 1.5, 'F');
          y += 3.5;
        }
      });

      y += 6;

      // FLOWCHART 3: AI Reservation Assistant Flow
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Flowchart 3: Gemini 2.5 Flash AI Assistant Processing Flow', 12, y);
      y += 6;

      const aiSteps = [
        { label: '1. User submits question or action prompt in AI Drawer', sub: 'e.g., "Find available Deluxe rooms for next weekend"' },
        { label: '2. Client injects current room inventory & active bookings context', sub: 'Ensures AI has full real-time property state awareness' },
        { label: '3. Express server proxies prompt to Gemini 2.5 Flash model', sub: 'Calls Google GenAI SDK with system instructions' },
        { label: '4. AI returns structured markdown answer with recommended actions', sub: 'Displays formatted response and quick action triggers in UI' }
      ];

      aiSteps.forEach((st, idx) => {
        doc.setFillColor(250, 245, 255); // purple-50
        doc.setDrawColor(192, 132, 252);
        doc.roundedRect(12, y, pageWidth - 24, 11, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(88, 28, 135);
        doc.text(st.label, 16, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(st.sub, 16, y + 8.5);

        y += 11;

        if (idx < aiSteps.length - 1) {
          doc.setDrawColor(148, 163, 184);
          doc.line(pageWidth / 2, y, pageWidth / 2, y + 3);
          doc.triangle(pageWidth / 2, y + 3, pageWidth / 2 - 1.5, y + 1.5, pageWidth / 2 + 1.5, y + 1.5, 'F');
          y += 3.5;
        }
      });

      addFooter(2, 2);

      // Save PDF
      doc.save('Nohshring_Homestay_Architecture_and_Flowcharts.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
                System Architecture & Tech Stack Documentation
              </h3>
              <p className="text-xs text-slate-400">Interactive Technical Specification, Architecture Diagram & Flowcharts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generatePDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PDF Document</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Interactive Preview */}
        <div className="p-6 overflow-y-auto space-y-8 bg-slate-50/50">
          
          {/* Tech Stack Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-600" />
                1. Technology Stack Specification
              </h4>
              <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 font-medium">
                Full-Stack Architecture
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-sky-600 tracking-wider">Frontend Client</span>
                  <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-mono font-bold">SPA / React 19</span>
                </div>
                <p className="text-sm font-bold text-slate-800">React 19 + TypeScript + Tailwind CSS v4</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Single-page application styled with Tailwind utility classes, Lucide icons, Motion animations, and Recharts analytics dashboards.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-amber-600 tracking-wider">Multi-Tenant Core</span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-mono font-bold">Property Scoping</span>
                </div>
                <p className="text-sm font-bold text-slate-800">Isolated Property Tenancy (propertyId)</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Supports multi-homestay location switching with scoped room inventories, bookings, guest histories, GSTIN invoices, and revenue stats.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Application Server</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">Port 3000 / Cloud Run</span>
                </div>
                <p className="text-sm font-bold text-slate-800">Node.js + Express API Backend</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Handles server-side API proxying for Telegram bot notifications, local JSON database file backup, and Gemini GenAI requests.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Database & State</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold">Google Cloud Firestore</span>
                </div>
                <p className="text-sm font-bold text-slate-800">Firebase v12 + LocalStorage Cache</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time multi-tenant cloud persistence for property locations, room inventory, bookings, and guest CRM profiles with offline state fallback.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-rose-600 tracking-wider">Bill Settlement</span>
                  <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-mono font-bold">Check-Out Settlement</span>
                </div>
                <p className="text-sm font-bold text-slate-800">Itemized Bill & Payment Modes</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automated balance bill adjustment popup upon check-out allowing cash or online (UPI/Card) settlement confirmation.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-purple-600 tracking-wider">Housekeeping & AI</span>
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono font-bold">Telegram & Gemini</span>
                </div>
                <p className="text-sm font-bold text-slate-800">Telegram Bot API & Gemini 2.5 Flash</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automated HTML housekeeping reminders dispatched on checkout and intelligent conversational reservation queries.
                </p>
              </div>
            </div>
          </div>

          {/* System Architecture Diagram */}
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-indigo-600" />
              2. System Architecture Diagram
            </h4>

            <div className="p-5 bg-slate-900 rounded-3xl border border-slate-800 text-white space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                
                {/* Layer 1 */}
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                  <div className="w-8 h-8 mx-auto bg-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-sky-400 uppercase tracking-wider">1. Client Layer</h5>
                  <p className="text-xs font-bold text-slate-200">React 19 SPA Browser UI</p>
                  <ul className="text-[11px] text-slate-400 space-y-1 text-left pt-2 border-t border-slate-700/60">
                    <li>• Occupancy Matrix View</li>
                    <li>• Booking Calendar & Room CRM</li>
                    <li>• Telegram Settings & AI Drawer</li>
                  </ul>
                </div>

                {/* Layer 2 */}
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                  <div className="w-8 h-8 mx-auto bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">2. Express Proxy Server</h5>
                  <p className="text-xs font-bold text-slate-200">Node.js Container (Port 3000)</p>
                  <ul className="text-[11px] text-slate-400 space-y-1 text-left pt-2 border-t border-slate-700/60">
                    <li>• POST /api/telegram/send</li>
                    <li>• GET & POST /api/db File Sync</li>
                    <li>• POST /api/ai/chat Gemini Proxy</li>
                  </ul>
                </div>

                {/* Layer 3 */}
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                  <div className="w-8 h-8 mx-auto bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">3. External Services</h5>
                  <p className="text-xs font-bold text-slate-200">Cloud Storage & APIs</p>
                  <ul className="text-[11px] text-slate-400 space-y-1 text-left pt-2 border-t border-slate-700/60">
                    <li>• Google Cloud Firestore DB</li>
                    <li>• Telegram Bot API Endpoint</li>
                    <li>• Gemini 2.5 Flash GenAI Model</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>

          {/* Flowcharts */}
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Workflow className="w-5 h-5 text-emerald-600" />
              3. Key Operational Flowcharts
            </h4>

            <div className="space-y-4">
              
              {/* Flowchart 1 */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-sky-500" />
                    Guest Check-out & Telegram Housekeeping Reminder Flow
                  </span>
                  <span className="text-[10px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded font-bold">Automated Event</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-sky-50 text-sky-900 rounded-xl font-medium border border-sky-100">
                    1. Staff clicks "Check Out" on active booking
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-900 rounded-xl font-medium border border-amber-200">
                    2. Bill Settlement Popup: Adjust via 1. Cash or 2. Online
                  </div>
                  <div className="p-2.5 bg-sky-50 text-sky-900 rounded-xl font-medium border border-sky-100">
                    3. React updates status to "checked_out" & Firestore sync
                  </div>
                  <div className="p-2.5 bg-sky-50 text-sky-900 rounded-xl font-medium border border-sky-100">
                    4. Express calls POST /api/telegram/send proxy
                  </div>
                  <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl font-bold border border-emerald-200">
                    5. Housekeeping staff receives Telegram alert!
                  </div>
                </div>
              </div>

              {/* Flowchart 2 */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    Multi-Tenant Location Scoping & Property Switching Flow
                  </span>
                  <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold">Multi-Tenancy</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-amber-50 text-amber-900 rounded-xl font-medium border border-amber-100">
                    1. Staff selects property location from Header dropdown
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-900 rounded-xl font-medium border border-amber-100">
                    2. React filters state context by selected propertyId
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-900 rounded-xl font-medium border border-amber-100">
                    3. Matrix, Calendar & Financials isolate matching property data
                  </div>
                  <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl font-bold border border-emerald-200">
                    4. Synchronizes property scoped state to Cloud Firestore
                  </div>
                </div>
              </div>

              {/* Flowchart 3 */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Booking Lifecycle & Multi-Tier Cloud Persistence Flow
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">Data Pipeline</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl font-medium border border-emerald-100">
                    1. Booking Created / Edited / Removed
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl font-medium border border-emerald-100">
                    2. Instant React state update (Zero Latency)
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl font-medium border border-emerald-100">
                    3. Write to Cloud Firestore collection
                  </div>
                  <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl font-bold border border-emerald-200">
                    4. Backup to LocalStorage & Server JSON DB
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            PDF formatted for standard A4 printing and digital sharing
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={generatePDF}
              disabled={isGeneratingPdf}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
