import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, disableNetwork } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Error Handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

let quotaExceededFlag = false;

export function setFirestoreQuotaExceeded() {
  quotaExceededFlag = true;
  try {
    sessionStorage.setItem('homestay_firestore_quota_exceeded', 'true');
    localStorage.setItem('homestay_firestore_quota_exceeded', 'true');
    localStorage.setItem('homestay_firestore_quota_time', Date.now().toString());
  } catch {
    // ignore
  }
  disableNetwork(db).catch(() => {});
}

export function isFirestoreQuotaExceeded() {
  if (quotaExceededFlag) return true;
  try {
    const quotaFlag = localStorage.getItem('homestay_firestore_quota_exceeded') || sessionStorage.getItem('homestay_firestore_quota_exceeded');
    const quotaTime = localStorage.getItem('homestay_firestore_quota_time');
    
    if (quotaFlag === 'true') {
      if (quotaTime && (Date.now() - parseInt(quotaTime, 10)) < 12 * 60 * 60 * 1000) {
        quotaExceededFlag = true;
        disableNetwork(db).catch(() => {});
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errObj = error as any;
  const errCode = errObj?.code || '';
  const fullErrStr = (errMessage + ' ' + errCode + ' ' + String(error)).toLowerCase();

  // If quota limit is exceeded or offline, set quota flag and log warning without throwing
  if (
    errCode === 'resource-exhausted' ||
    fullErrStr.includes('resource-exhausted') ||
    fullErrStr.includes('quota limit exceeded') ||
    fullErrStr.includes('resource_exhausted') ||
    fullErrStr.includes('quota')
  ) {
    setFirestoreQuotaExceeded();
    console.warn('Firestore write/read quota reached. Operating smoothly via LocalStorage & Express fallback.');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));

  throw new Error(JSON.stringify(errInfo));
}

// Function to test connectivity
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline. Checking connection parameters.");
    }
  }
}

/**
 * Upload room photo file directly to Firebase Storage and return its public download URL.
 * Includes a timeout guard for CORS preflight blocks in browser environments.
 */
export async function uploadRoomPhotoToFirebaseStorage(
  file: File,
  roomIdOrTemp: string,
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const safeFilename = `room-photos/${roomIdOrTemp}_${timestamp}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  
  const storageRef = ref(storage, safeFilename);
  const uploadTask = uploadBytesResumable(storageRef, file);

  const uploadPromise = new Promise<string>((resolve, reject) => {
    let progressTimer: NodeJS.Timeout | null = null;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        if (progressTimer) clearTimeout(progressTimer);
        console.error('Firebase Storage Upload Error:', error);
        reject(error);
      },
      async () => {
        if (progressTimer) clearTimeout(progressTimer);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );

    // Timeout guard if CORS preflight blocks connection or hangs
    progressTimer = setTimeout(() => {
      try {
        uploadTask.cancel();
      } catch {
        // ignore
      }
      reject(new Error('Firebase Storage upload blocked by bucket CORS policy or network timeout. Falling back to local image optimizer.'));
    }, 4000);
  });

  return uploadPromise;
}
