import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { UserRole, Property } from '../../types';
import {
  ShieldCheck,
  User,
  Key,
  Mail,
  Building,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  Crown,
  Briefcase,
  UserCheck,
  UserCog
} from 'lucide-react';

interface LoginModalProps {
  properties: Property[];
  isOpen: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ properties, isOpen, onClose }) => {
  const {
    currentUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    loginAsDemoUser,
    logout
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'google' | 'email' | 'demo'>('google');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Email form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(properties[0]?.id || 'p-nohshring');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoadingAction(true);
    try {
      await loginWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in failed. Please try again or use email login.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoadingAction(true);
    try {
      if (isRegistering) {
        if (!displayName) {
          setErrorMsg('Please provide your full name.');
          setLoadingAction(false);
          return;
        }
        await registerWithEmail(email, password, displayName, selectedRole, selectedTenantId);
      } else {
        await loginWithEmail(email, password);
      }
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoadingAction(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md border border-amber-300 flex items-center gap-1"><Crown className="w-3 h-3 text-amber-600" /> Super Admin</span>;
      case 'owner':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 flex items-center gap-1"><Briefcase className="w-3 h-3 text-emerald-600" /> Owner</span>;
      case 'manager':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-300 flex items-center gap-1"><UserCog className="w-3 h-3 text-blue-600" /> Manager</span>;
      case 'staff':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-300 flex items-center gap-1"><UserCheck className="w-3 h-3 text-slate-500" /> Front Desk Staff</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sign In & Tenant Access Control</h2>
              <p className="text-xs text-slate-500">Secure multi-tenant authentication with role permissions</p>
            </div>
          </div>
          {currentUser && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Current User Status Banner if logged in */}
        {currentUser && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=0D9488&color=fff`}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full border border-emerald-300 object-cover"
              />
              <div>
                <p className="font-bold text-slate-900">{currentUser.displayName}</p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getRoleBadge(currentUser.role)}
              <button
                onClick={() => logout()}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 bg-white border border-rose-200 rounded-lg transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-medium text-slate-600">
          <button
            onClick={() => { setActiveTab('google'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'google' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Gmail / Google
          </button>
          
          <button
            onClick={() => { setActiveTab('email'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'email' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            Email & Pass
          </button>

          <button
            onClick={() => { setActiveTab('demo'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'demo' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Demo Roles
          </button>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: GOOGLE / GMAIL */}
        {activeTab === 'google' && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-600">
                Sign in with your Google or Gmail account to access your assigned Homestay Tenant property portal.
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loadingAction}
              className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {loadingAction ? 'Authenticating...' : 'Sign in with Google / Gmail'}
            </button>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Tenant Access Policy:</span>
              <p>Google authenticated accounts automatically sync with assigned property permissions in Firestore. First-time users are granted property management access by default.</p>
            </div>
          </div>
        )}

        {/* TAB 2: EMAIL & PASSWORD */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5 py-1">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-bold text-slate-800">
                {isRegistering ? 'Create Tenant Staff Account' : 'Sign In with Email'}
              </span>
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {isRegistering ? 'Already registered? Sign In' : 'New User? Register Account'}
              </button>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Prasenjit Hojai"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. prasenjithojai@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign User Role</label>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="owner">Owner (Full Property Control)</option>
                    <option value="manager">Manager (Operations & Front Desk)</option>
                    <option value="staff">Staff (Front Desk & Check-in)</option>
                    <option value="super_admin">Super Admin (All Tenants)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Tenant Property</label>
                  <select
                    value={selectedTenantId}
                    onChange={e => setSelectedTenantId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Properties (Multi-tenant)</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingAction}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50 mt-2"
            >
              {isRegistering ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {loadingAction ? 'Processing...' : (isRegistering ? 'Register Tenant Account' : 'Sign In')}
            </button>
          </form>
        )}

        {/* TAB 3: DEMO ROLES */}
        {activeTab === 'demo' && (
          <div className="space-y-3 py-1">
            <p className="text-xs text-slate-600 font-medium">
              Select a pre-configured role profile to instantly test tenant-specific views and data permissions:
            </p>

            <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {DEMO_USERS.map(demo => {
                const assignedProps = properties.filter(p => demo.assignedPropertyIds.includes(p.id) || demo.tenantId === 'all');
                return (
                  <button
                    key={demo.uid}
                    type="button"
                    onClick={() => {
                      loginAsDemoUser(demo.uid);
                      if (onClose) onClose();
                    }}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={demo.photoURL}
                        alt={demo.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{demo.displayName}</span>
                          {getRoleBadge(demo.role)}
                        </div>
                        <p className="text-[11px] text-slate-500">{demo.email}</p>
                        <p className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-emerald-600" />
                          Tenant: {demo.tenantId === 'all' ? 'All Tenants (Multi-Property)' : (assignedProps[0]?.name || 'Noahsring Homestay')}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Engine v2026.1 • Firebase Auth & Firestore ABAC</span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tenant Isolated
          </span>
        </div>

      </div>
    </div>
  );
};
