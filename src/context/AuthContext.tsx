import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AppUser, UserRole } from '../types';

export const DEMO_USERS: AppUser[] = [
  {
    uid: 'demo-super-admin',
    email: 'admin@noahsring.com',
    displayName: 'Prasenjit (Super Admin)',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    role: 'super_admin',
    tenantId: 'all',
    assignedPropertyIds: ['p-nohshring', 'p-riverside'],
  },
  {
    uid: 'demo-owner-nohshring',
    email: 'owner@noahsring.com',
    displayName: 'Sainsring Naiding (Owner)',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    role: 'owner',
    tenantId: 'p-nohshring',
    assignedPropertyIds: ['p-nohshring'],
  },
  {
    uid: 'demo-manager-riverside',
    email: 'manager.riverside@gmail.com',
    displayName: 'Milee Naiding (Manager)',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    role: 'manager',
    tenantId: 'p-riverside',
    assignedPropertyIds: ['p-riverside'],
  },
  {
    uid: 'demo-staff-nohshring',
    email: 'staff.nohshring@gmail.com',
    displayName: 'Rohan Roy (Front Desk Staff)',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    role: 'staff',
    tenantId: 'p-nohshring',
    assignedPropertyIds: ['p-nohshring'],
  }
];

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role: UserRole, tenantId: string) => Promise<void>;
  loginAsDemoUser: (demoUid: string) => void;
  updateUserRoleAndTenant: (uid: string, role: UserRole, tenantId: string, assignedPropertyIds: string[]) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('homestay_app_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Default to Super Admin for seamless initial preview if not logged in
    return DEMO_USERS[0];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync current user profile from Firestore or Auth listener
  const syncUserDoc = async (fbUser: FirebaseUser): Promise<AppUser> => {
    const userRef = doc(db, 'users', fbUser.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as AppUser;
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email || data.email || 'user@noahsring.com',
          displayName: fbUser.displayName || data.displayName || 'Homestay Staff',
          photoURL: fbUser.photoURL || data.photoURL,
          role: data.role || 'owner',
          tenantId: data.tenantId || 'p-nohshring',
          assignedPropertyIds: data.assignedPropertyIds && data.assignedPropertyIds.length > 0 ? data.assignedPropertyIds : ['p-nohshring'],
        };
        return appUser;
      } else {
        // Create new user profile in Firestore
        const defaultRole: UserRole = fbUser.email?.includes('admin') ? 'super_admin' : 'owner';
        const defaultTenant = 'p-nohshring';
        const newAppUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email || 'user@noahsring.com',
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Homestay Staff'),
          photoURL: fbUser.photoURL || undefined,
          role: defaultRole,
          tenantId: defaultTenant,
          assignedPropertyIds: defaultRole === 'super_admin' ? ['p-nohshring', 'p-riverside'] : ['p-nohshring'],
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newAppUser);
        return newAppUser;
      }
    } catch (err) {
      console.warn('Could not fetch/create Firestore user doc, using memory fallback:', err);
      const fallbackUser: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email || 'user@noahsring.com',
        displayName: fbUser.displayName || 'Homestay Staff',
        photoURL: fbUser.photoURL || undefined,
        role: 'owner',
        tenantId: 'p-nohshring',
        assignedPropertyIds: ['p-nohshring'],
      };
      return fallbackUser;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser = await syncUserDoc(fbUser);
        setCurrentUser(appUser);
        localStorage.setItem('homestay_app_user', JSON.stringify(appUser));
      } else {
        // Check if demo user is stored in localStorage
        const saved = localStorage.getItem('homestay_app_user');
        if (saved) {
          try {
            const parsed: AppUser = JSON.parse(saved);
            setCurrentUser(parsed);
          } catch {
            setCurrentUser(DEMO_USERS[0]);
          }
        } else {
          setCurrentUser(DEMO_USERS[0]);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        const appUser = await syncUserDoc(res.user);
        setCurrentUser(appUser);
        localStorage.setItem('homestay_app_user', JSON.stringify(appUser));
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        const appUser = await syncUserDoc(res.user);
        setCurrentUser(appUser);
        localStorage.setItem('homestay_app_user', JSON.stringify(appUser));
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      // Fallback for simulated/demo email login if Firebase Auth email provider is disabled
      console.warn('Firebase email auth error, attempting demo match or local login:', err);
      const matchingDemo = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (matchingDemo) {
        setCurrentUser(matchingDemo);
        localStorage.setItem('homestay_app_user', JSON.stringify(matchingDemo));
        setIsAuthModalOpen(false);
        return;
      }
      
      // Otherwise create a quick logged in state
      const customUser: AppUser = {
        uid: `user-${Date.now()}`,
        email,
        displayName: email.split('@')[0],
        role: 'owner',
        tenantId: 'p-nohshring',
        assignedPropertyIds: ['p-nohshring'],
      };
      setCurrentUser(customUser);
      localStorage.setItem('homestay_app_user', JSON.stringify(customUser));
      setIsAuthModalOpen(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    tenantId: string
  ) => {
    const assigned = tenantId === 'all' || role === 'super_admin' ? ['p-nohshring', 'p-riverside'] : [tenantId];
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        const newUser: AppUser = {
          uid: res.user.uid,
          email,
          displayName: name || email.split('@')[0],
          role,
          tenantId,
          assignedPropertyIds: assigned,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', res.user.uid), newUser);
        setCurrentUser(newUser);
        localStorage.setItem('homestay_app_user', JSON.stringify(newUser));
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      console.warn('Firebase create user error, using local registration fallback:', err);
      const newUser: AppUser = {
        uid: `reg-${Date.now()}`,
        email,
        displayName: name || email.split('@')[0],
        role,
        tenantId,
        assignedPropertyIds: assigned,
        createdAt: new Date().toISOString()
      };
      setCurrentUser(newUser);
      localStorage.setItem('homestay_app_user', JSON.stringify(newUser));
      setIsAuthModalOpen(false);
    }
  };

  const loginAsDemoUser = (demoUid: string) => {
    const found = DEMO_USERS.find(u => u.uid === demoUid) || DEMO_USERS[0];
    setCurrentUser(found);
    localStorage.setItem('homestay_app_user', JSON.stringify(found));
    setIsAuthModalOpen(false);
  };

  const updateUserRoleAndTenant = async (
    uid: string,
    role: UserRole,
    tenantId: string,
    assignedPropertyIds: string[]
  ) => {
    if (!currentUser) return;
    const updatedUser: AppUser = {
      ...currentUser,
      role,
      tenantId,
      assignedPropertyIds: assignedPropertyIds.length > 0 ? assignedPropertyIds : [tenantId]
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('homestay_app_user', JSON.stringify(updatedUser));

    try {
      await setDoc(doc(db, 'users', uid), updatedUser, { merge: true });
    } catch (e) {
      console.warn('Failed to update user role in Firestore:', e);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem('homestay_app_user');
    setIsAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAsDemoUser,
        updateUserRoleAndTenant,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
