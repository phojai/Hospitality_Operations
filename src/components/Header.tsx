import React, { useState, useRef, useEffect } from 'react';
import { getTodayIST, formatDateReadable } from '../utils/bookingUtils';
import { Property, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Home,
  Users,
  BarChart3,
  PlusCircle,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle2,
  BedDouble,
  Receipt,
  Database,
  Clock,
  Bot,
  FileText,
  Building2,
  ChevronDown,
  Check,
  User,
  ShieldCheck,
  LogIn,
  Crown,
  Briefcase,
  UserCog,
  UserCheck,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeRoomsCount: number;
  totalRoomsCount: number;
  properties: Property[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
  openPropertyManager: () => void;
  openAiAssistant: () => void;
  openTelegramSettings: () => void;
  openSystemDocs: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onQuickNewBooking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeRoomsCount,
  totalRoomsCount,
  properties = [],
  selectedPropertyId,
  onSelectProperty,
  openPropertyManager,
  openAiAssistant,
  openTelegramSettings,
  openSystemDocs,
  onResetData,
  onExportData,
  onQuickNewBooking,
}) => {
  const { currentUser, logout, setIsAuthModalOpen } = useAuth();

  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPropertyDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter properties according to logged-in user permissions
  const authorizedProperties = properties.filter(p => {
    if (!currentUser) return true;
    if (currentUser.role === 'super_admin' || currentUser.assignedPropertyIds.includes('all')) return true;
    return currentUser.assignedPropertyIds.includes(p.id);
  });

  const currentProperty = properties.find(p => p.id === selectedPropertyId);
  const currentPropertyName = selectedPropertyId === 'all'
    ? 'All Properties (Combined)'
    : (currentProperty ? currentProperty.name : 'Nohshring Homestay');

  const getRoleBadge = (role?: UserRole) => {
    if (!role) return null;
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" /> Super Admin</span>;
      case 'owner':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1"><Briefcase className="w-3 h-3 text-emerald-400" /> Owner</span>;
      case 'manager':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full flex items-center gap-1"><UserCog className="w-3 h-3 text-blue-400" /> Manager</span>;
      case 'staff':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40 rounded-full flex items-center gap-1"><UserCheck className="w-3 h-3 text-slate-400" /> Front Desk Staff</span>;
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Occupancy', icon: Home },
    { id: 'calendar', label: 'Calendar Matrix', icon: Calendar },
    { id: 'bookings', label: 'Bookings', icon: Receipt },
    { id: 'rooms', label: 'Room Inventory', icon: BedDouble },
    { id: 'revenue', label: 'Revenue Analytics', icon: BarChart3 },
    { id: 'guests', label: 'Guest CRM', icon: Users },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Brand Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 sm:py-3.5 gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2.5 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-900/30">
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {/* Multi-Property Switcher Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                    className="text-base sm:text-xl font-bold tracking-tight text-slate-50 flex items-center gap-1.5 hover:text-emerald-300 transition cursor-pointer group bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/80"
                    title="Switch Property Location"
                  >
                    <Building2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                    <span>{currentPropertyName}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${propertyDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Options */}
                  {propertyDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                        Authorized Homestay Tenant(s)
                      </div>

                      {(currentUser?.role === 'super_admin' || currentUser?.assignedPropertyIds.includes('all')) && (
                        <button
                          onClick={() => {
                            onSelectProperty('all');
                            setPropertyDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/70 transition ${
                            selectedPropertyId === 'all' ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>🏢</span> All Properties (Combined Portfolio)
                          </span>
                          {selectedPropertyId === 'all' && <Check className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-700/60" />

                      {authorizedProperties.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProperty(p.id);
                            setPropertyDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/70 transition ${
                            selectedPropertyId === p.id ? 'text-emerald-400 font-bold bg-slate-700/40' : 'text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span>🏡</span> {p.name}
                          </span>
                          {selectedPropertyId === p.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}

                      <div className="my-1 border-t border-slate-700/60" />

                      <button
                        onClick={() => {
                          openPropertyManager();
                          setPropertyDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-amber-300 font-bold hover:bg-slate-700/80 transition flex items-center gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5 text-amber-400" /> + Manage & Add Properties
                      </button>
                    </div>
                  )}
                </div>

                <span className="hidden sm:inline-flex px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {activeRoomsCount}/{totalRoomsCount} Rooms Active
                </span>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full items-center gap-1" title="Indian Standard Time (IST)">
                  <Clock className="w-3 h-3 text-amber-400" /> IST: {formatDateReadable(getTodayIST())}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400">Multi-Property Management & Reservation Platform</p>
            </div>
          </div>

          {/* Quick Action Controls & User Auth Section */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
            {/* USER LOGIN & PROFILE DROPDOWN */}
            <div className="relative" ref={userDropdownRef}>
              {currentUser ? (
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/90 rounded-xl flex items-center gap-2 transition cursor-pointer text-left group"
                >
                  <img
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=0D9488&color=fff`}
                    alt={currentUser.displayName}
                    className="w-6 h-6 rounded-full border border-emerald-400 object-cover shrink-0"
                  />
                  <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition truncate max-w-[120px]">
                      {currentUser.displayName}
                    </p>
                  </div>
                  {getRoleBadge(currentUser.role)}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}

              {/* User Account Dropdown Menu */}
              {userDropdownOpen && currentUser && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 bg-slate-900/80 rounded-lg mb-2 space-y-1 border border-slate-700/50">
                    <p className="font-bold text-slate-100 text-xs">{currentUser.displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Assigned Role:</span>
                      {getRoleBadge(currentUser.role)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-slate-700/80 text-emerald-300 font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Switch Role / Account</span>
                  </button>

                  <div className="my-1 border-t border-slate-700/60" />

                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-rose-900/40 text-rose-300 font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* New Booking Button */}
            <button
              onClick={onQuickNewBooking}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-extrabold shadow-md flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0"
              title="Create New Booking"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>+ New Booking</span>
            </button>

            {/* Properties Manager */}
            <button
              onClick={openPropertyManager}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs sm:text-sm font-medium shadow flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0"
              title="Manage Properties Portfolio"
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span>Properties</span>
            </button>

            {/* AI Assistant */}
            <button
              onClick={openAiAssistant}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs sm:text-sm font-medium shadow-md flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0"
              title="Open AI Reservation Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse shrink-0" />
              <span>AI Assistant</span>
            </button>

            {/* Telegram Bot */}
            <button
              onClick={openTelegramSettings}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs sm:text-sm font-medium shadow flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0"
              title="Configure Telegram Bot Housekeeping Notifications"
            >
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-200 shrink-0" />
              <span>Telegram Bot</span>
            </button>

            {/* Tech PDF Button */}
            <button
              onClick={openSystemDocs}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 rounded-lg text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer shrink-0"
              title="View Tech Stack, Architecture Diagram & Download PDF Report"
            >
              <span>Tech PDF</span>
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            </button>

            <div className="h-5 w-px bg-slate-700 mx-0.5 shrink-0" />

            {/* Export Backup */}
            <button
              onClick={onExportData}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition shrink-0 cursor-pointer"
              title="Export JSON Backup"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Reset Data */}
            <button
              onClick={onResetData}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg transition shrink-0 cursor-pointer"
              title="Reset Sample Data"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/80">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

