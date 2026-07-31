import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirestoreQuotaExceeded, setFirestoreQuotaExceeded } from './firebase';
import { Room, Booking, GuestProfile, Property } from '../types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_GUESTS, INITIAL_PROPERTIES } from '../data/initialData';

export interface AppData {
  rooms: Room[];
  bookings: Booking[];
  guests: GuestProfile[];
  properties: Property[];
}

let isQuotaExceeded = false;
let lastSyncedItemHashes = new Map<string, string>();

function checkQuotaExceeded(): boolean {
  return isQuotaExceeded || isFirestoreQuotaExceeded();
}

function markQuotaExceeded(): void {
  isQuotaExceeded = true;
  setFirestoreQuotaExceeded();
}

function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err) + ' ' + (err instanceof Error ? err.message : '') + ' ' + ((err as any)?.code || '');
  const lower = str.toLowerCase();
  return lower.includes('resource-exhausted') || lower.includes('quota') || lower.includes('exhausted');
}

// Ensure clean numeric values and remove undefined fields for Firestore compatibility
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean as T;
}

/**
 * Load initial data from Firestore database.
 * If Firestore is empty (e.g., first setup), seeds initial default records into Firestore.
 */
export async function loadAppDataFromFirestore(): Promise<AppData> {
  if (checkQuotaExceeded()) {
    throw new Error('Firestore quota limit reached. Using local storage fallback.');
  }

  try {
    const fetchColl = async (collName: string) => {
      if (checkQuotaExceeded()) return null;
      try {
        return await getDocs(collection(db, collName));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, collName);
        return null;
      }
    };

    const propsSnap = await fetchColl('properties');
    if (checkQuotaExceeded() || !propsSnap) {
      markQuotaExceeded();
      throw new Error('Firestore query failed or quota exceeded. Falling back to local storage.');
    }

    const roomsSnap = await fetchColl('rooms');
    if (checkQuotaExceeded() || !roomsSnap) {
      markQuotaExceeded();
      throw new Error('Firestore query failed or quota exceeded. Falling back to local storage.');
    }

    const bookingsSnap = await fetchColl('bookings');
    if (checkQuotaExceeded() || !bookingsSnap) {
      markQuotaExceeded();
      throw new Error('Firestore query failed or quota exceeded. Falling back to local storage.');
    }

    const guestsSnap = await fetchColl('guests');
    if (checkQuotaExceeded() || !guestsSnap) {
      markQuotaExceeded();
      throw new Error('Firestore query failed or quota exceeded. Falling back to local storage.');
    }

    let loadedProperties: Property[] = [];
    let loadedRooms: Room[] = [];
    let loadedBookings: Booking[] = [];
    let loadedGuests: GuestProfile[] = [];

    if (!propsSnap.empty) {
      loadedProperties = propsSnap.docs.map(d => d.data() as Property);
    }

    if (!roomsSnap.empty) {
      loadedRooms = roomsSnap.docs.map(d => d.data() as Room);
    }

    if (!bookingsSnap.empty) {
      loadedBookings = bookingsSnap.docs.map(d => d.data() as Booking);
    }

    if (!guestsSnap.empty) {
      loadedGuests = guestsSnap.docs.map(d => d.data() as GuestProfile);
    }

    // Only seed if snapshot fetches succeeded and collections were verified empty
    if (loadedProperties.length === 0 && !checkQuotaExceeded()) {
      console.log('Seeding initial properties to Firestore...');
      loadedProperties = INITIAL_PROPERTIES;
      await seedPropertiesToFirestore(INITIAL_PROPERTIES);
    }

    if (loadedRooms.length === 0 && !checkQuotaExceeded()) {
      console.log('Seeding initial room inventory to Firestore...');
      loadedRooms = INITIAL_ROOMS;
      await seedRoomsToFirestore(INITIAL_ROOMS);
    }

    if (loadedBookings.length === 0 && loadedGuests.length === 0 && !checkQuotaExceeded()) {
      const hasSeededBefore = localStorage.getItem('homestay_firestore_seeded');
      if (!hasSeededBefore) {
        console.log('Seeding initial bookings and guests to Firestore...');
        loadedBookings = INITIAL_BOOKINGS;
        loadedGuests = INITIAL_GUESTS;
        await seedBookingsAndGuestsToFirestore(INITIAL_BOOKINGS, INITIAL_GUESTS);
        localStorage.setItem('homestay_firestore_seeded', 'true');
      }
    }

    // Apply default propertyId to existing rooms/bookings if missing
    loadedRooms = loadedRooms.map(r => ({
      ...r,
      propertyId: r.propertyId || 'p-nohshring'
    }));

    loadedBookings = loadedBookings.map(b => ({
      ...b,
      propertyId: b.propertyId || 'p-nohshring'
    }));

    // Apply rule: Rooms 2.1 and 3.1 default price fix if needed
    loadedRooms = loadedRooms.map(r => {
      if (r.roomNumber === '2.1' || r.roomNumber === '3.1' || r.name.includes('2.1') || r.name.includes('3.1')) {
        if (!r.pricePerNight || r.pricePerNight < 2500) {
          return { ...r, pricePerNight: 2500 };
        }
      }
      return r;
    });

    // Prime initial item hashes to prevent initial sync from writing unchanged documents
    loadedProperties.forEach(p => lastSyncedItemHashes.set(`properties/${p.id}`, JSON.stringify(sanitizeForFirestore(p))));
    loadedRooms.forEach(r => lastSyncedItemHashes.set(`rooms/${r.id}`, JSON.stringify(sanitizeForFirestore(r))));
    loadedBookings.forEach(b => lastSyncedItemHashes.set(`bookings/${b.id}`, JSON.stringify(sanitizeForFirestore(b))));
    loadedGuests.forEach(g => lastSyncedItemHashes.set(`guests/${g.id}`, JSON.stringify(sanitizeForFirestore(g))));

    return {
      properties: loadedProperties,
      rooms: loadedRooms,
      bookings: loadedBookings,
      guests: loadedGuests
    };
  } catch (err) {
    console.warn('Firestore load failed, falling back to local storage:', err);
    throw err;
  }
}

/**
 * Seed initial properties to Firestore
 */
async function seedPropertiesToFirestore(properties: Property[]) {
  if (checkQuotaExceeded()) return;
  try {
    const batch = writeBatch(db);
    properties.forEach(p => {
      const ref = doc(db, 'properties', p.id);
      batch.set(ref, sanitizeForFirestore(p));
    });
    await batch.commit();
  } catch (e) {
    if (isQuotaError(e)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached during property seeding.');
      return;
    }
    console.error('Failed to seed properties to Firestore:', e);
  }
}

/**
 * Seed initial room inventory into Firestore
 */
async function seedRoomsToFirestore(rooms: Room[]) {
  if (checkQuotaExceeded()) return;
  try {
    const batch = writeBatch(db);
    rooms.forEach(r => {
      const ref = doc(db, 'rooms', r.id);
      batch.set(ref, sanitizeForFirestore(r));
    });
    await batch.commit();
  } catch (e) {
    if (isQuotaError(e)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached during room seeding.');
      return;
    }
    console.error('Failed to seed rooms to Firestore:', e);
  }
}

/**
 * Seed initial bookings and guests into Firestore
 */
async function seedBookingsAndGuestsToFirestore(bookings: Booking[], guests: GuestProfile[]) {
  if (checkQuotaExceeded()) return;
  try {
    const batch = writeBatch(db);
    bookings.forEach(b => {
      const ref = doc(db, 'bookings', b.id);
      batch.set(ref, sanitizeForFirestore(b));
    });
    guests.forEach(g => {
      const ref = doc(db, 'guests', g.id);
      batch.set(ref, sanitizeForFirestore(g));
    });
    await batch.commit();
  } catch (e) {
    if (isQuotaError(e)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached during bookings/guests seeding.');
      return;
    }
    console.error('Failed to seed bookings & guests to Firestore:', e);
  }
}

/**
 * Save single room to Firestore
 */
export async function saveRoomToFirestore(room: Room): Promise<void> {
  if (checkQuotaExceeded()) return;
  try {
    await setDoc(doc(db, 'rooms', room.id), sanitizeForFirestore(room));
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached. Switched to local storage.');
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, `rooms/${room.id}`);
  }
}

/**
 * Save single booking to Firestore
 */
export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  if (checkQuotaExceeded()) return;
  try {
    await setDoc(doc(db, 'bookings', booking.id), sanitizeForFirestore(booking));
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached. Switched to local storage.');
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, `bookings/${booking.id}`);
  }
}

/**
 * Save single guest profile to Firestore
 */
export async function saveGuestToFirestore(guest: GuestProfile): Promise<void> {
  if (checkQuotaExceeded()) return;
  try {
    await setDoc(doc(db, 'guests', guest.id), sanitizeForFirestore(guest));
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached. Switched to local storage.');
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, `guests/${guest.id}`);
  }
}

/**
 * Delete a booking from Firestore
 */
export async function deleteBookingFromFirestore(bookingId: string): Promise<void> {
  if (checkQuotaExceeded()) return;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached. Switched to local storage.');
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `bookings/${bookingId}`);
  }
}

/**
 * Clear all bookings and guests from Firestore
 */
export async function clearAllBookingsFromFirestore(): Promise<void> {
  if (checkQuotaExceeded()) return;
  try {
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const guestsSnap = await getDocs(collection(db, 'guests'));

    const batch = writeBatch(db);
    bookingsSnap.docs.forEach(d => batch.delete(d.ref));
    guestsSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      console.warn('Firestore write quota reached. Switched to local storage.');
      return;
    }
    console.error('Failed to clear bookings in Firestore:', err);
  }
}

/**
 * Sync entire state to Firestore with item-level diffing to conserve write quota
 */
export async function syncAllToFirestore(rooms: Room[], bookings: Booking[], guests: GuestProfile[], properties?: Property[]): Promise<void> {
  if (checkQuotaExceeded()) return;

  try {
    const batch = writeBatch(db);
    let changeCount = 0;

    const checkAndStage = (collectionName: string, id: string, dataObj: any) => {
      const sanitized = sanitizeForFirestore(dataObj);
      const hashKey = `${collectionName}/${id}`;
      const jsonStr = JSON.stringify(sanitized);

      if (lastSyncedItemHashes.get(hashKey) !== jsonStr) {
        batch.set(doc(db, collectionName, id), sanitized);
        lastSyncedItemHashes.set(hashKey, jsonStr);
        changeCount++;
      }
    };

    if (properties && properties.length > 0) {
      properties.forEach(p => checkAndStage('properties', p.id, p));
    }
    rooms.forEach(r => checkAndStage('rooms', r.id, r));
    bookings.forEach(b => checkAndStage('bookings', b.id, b));
    guests.forEach(g => checkAndStage('guests', g.id, g));

    if (changeCount > 0) {
      await batch.commit();
      console.log(`Firestore sync completed: updated ${changeCount} changed document(s).`);
    }
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExceeded();
      console.warn('Firestore write quota limit reached. Operational state preserved via LocalStorage & Express backend.');
    } else {
      console.warn('Failed batch sync to Firestore:', err);
    }
  }
}
