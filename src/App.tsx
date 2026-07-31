import React, { useState, useEffect } from 'react';
import { Room, Booking, GuestProfile, Property } from './types';
import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_GUESTS, INITIAL_PROPERTIES, generateInitialBookings, generateInitialGuests } from './data/initialData';
import { Header } from './components/Header';
import { OccupancyDashboard } from './components/Dashboard/OccupancyDashboard';
import { CalendarView } from './components/Calendar/CalendarView';
import { BookingWizard } from './components/Bookings/BookingWizard';
import { BookingList } from './components/Bookings/BookingList';
import { RoomManagement } from './components/Rooms/RoomManagement';
import { RevenueDashboard } from './components/Analytics/RevenueDashboard';
import { GuestCRM } from './components/Guests/GuestCRM';
import { AiAssistantDrawer } from './components/AiAssistant/AiAssistantDrawer';
import { TelegramSettingsModal } from './components/Settings/TelegramSettingsModal';
import { SystemDocPdfModal } from './components/Documentation/SystemDocPdfModal';
import { PropertyManagerModal } from './components/Properties/PropertyManagerModal';
import { CheckOutModal } from './components/Bookings/CheckOutModal';
import { LoginModal } from './components/Auth/LoginModal';
import { useAuth } from './context/AuthContext';
import { sendHousekeepingTelegramReminder } from './utils/telegramUtils';
import {
  loadAppDataFromFirestore,
  syncAllToFirestore,
  saveBookingToFirestore,
  saveGuestToFirestore,
  clearAllBookingsFromFirestore
} from './lib/dbService';

// Helper to normalize phone numbers for accurate matching across devices
const normalizeMobile = (m?: string): string => {
  if (!m) return '';
  const digits = m.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Helper to merge local and remote bookings without dropping un-synced local records
const mergeBookings = (existing: Booking[], incoming: Booking[]): Booking[] => {
  const map = new Map<string, Booking>();
  
  existing.forEach(b => {
    if (b && b.id) map.set(b.id, b);
  });

  incoming.forEach(b => {
    if (b && b.id) {
      if (!map.has(b.id)) {
        map.set(b.id, b);
      } else {
        const ex = map.get(b.id)!;
        const exTime = new Date(ex.createdAt || 0).getTime();
        const incTime = new Date(b.createdAt || 0).getTime();
        if (incTime >= exTime) {
          map.set(b.id, { ...ex, ...b });
        }
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
};

// Helper to merge local and remote guest profiles
const mergeGuests = (existing: GuestProfile[], incoming: GuestProfile[]): GuestProfile[] => {
  const map = new Map<string, GuestProfile>();
  existing.forEach(g => {
    if (g && g.id) map.set(g.id, g);
  });
  incoming.forEach(g => {
    if (g && g.id) {
      if (!map.has(g.id)) {
        map.set(g.id, g);
      } else {
        const ex = map.get(g.id)!;
        map.set(g.id, { ...ex, ...g });
      }
    }
  });
  return Array.from(map.values());
};

export default function App() {
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('homestay_properties');
    if (saved) {
      try {
        const parsed: Property[] = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_PROPERTIES;
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    return localStorage.getItem('homestay_selected_property_id') || 'p-nohshring';
  });

  const [propertyModalOpen, setPropertyModalOpen] = useState<boolean>(false);

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('homestay_rooms');
    if (saved) {
      try {
        const parsed: Room[] = JSON.parse(saved);
        const updated = parsed.map(r => {
          if (r.roomNumber === '2.1' || r.roomNumber === '3.1' || r.name.includes('2.1') || r.name.includes('3.1')) {
            return { ...r, pricePerNight: 2500 };
          }
          return r;
        });
        return updated;
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_ROOMS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('homestay_bookings');
    if (saved) {
      try {
        const parsed: Booking[] = JSON.parse(saved);
        const realBookings = parsed.filter(b => !['b-101', 'b-102', 'b-103', 'b-104', 'b-105', 'b-106'].includes(b.id));
        if (realBookings.length > 0) return realBookings;
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_BOOKINGS;
  });

  const [guests, setGuests] = useState<GuestProfile[]>(() => {
    const saved = localStorage.getItem('homestay_guests');
    if (saved) {
      try {
        const parsed: GuestProfile[] = JSON.parse(saved);
        const realGuests = parsed.filter(g => !['g-101', 'g-102', 'g-103', 'g-104'].includes(g.id));
        if (realGuests.length > 0) return realGuests;
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_GUESTS;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [aiAssistantOpen, setAiAssistantOpen] = useState<boolean>(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState<boolean>(false);
  const [systemDocsModalOpen, setSystemDocsModalOpen] = useState<boolean>(false);
  const [toastAlert, setToastAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);

  const { currentUser, isAuthModalOpen, setIsAuthModalOpen } = useAuth();

  // Enforce tenant property assignment for logged in user
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'super_admin' || currentUser.assignedPropertyIds.includes('all')) return;

    // If currently selected property is not allowed for this user, force switch to their first authorized property
    if (!currentUser.assignedPropertyIds.includes(selectedPropertyId)) {
      if (currentUser.assignedPropertyIds.length > 0) {
        setSelectedPropertyId(currentUser.assignedPropertyIds[0]);
      }
    }
  }, [currentUser, selectedPropertyId]);

  // Filtered views based on active property selection
  const activePropertyId = selectedPropertyId === 'all' ? 'p-nohshring' : selectedPropertyId;

  const filteredRooms = selectedPropertyId === 'all'
    ? rooms
    : rooms.filter(r => (r.propertyId || 'p-nohshring') === selectedPropertyId);

  const filteredBookings = selectedPropertyId === 'all'
    ? bookings
    : bookings.filter(b => (b.propertyId || 'p-nohshring') === selectedPropertyId);

  // Load persistent data from Cloud Firestore database on startup
  useEffect(() => {
    let isMounted = true;

    loadAppDataFromFirestore()
      .then(data => {
        if (!isMounted) return;
        if (data.properties && data.properties.length > 0) {
          setProperties(data.properties);
        }
        if (data.rooms && data.rooms.length > 0) {
          setRooms(data.rooms);
        }
        if (data.bookings) {
          setBookings(prev => mergeBookings(prev, data.bookings));
        }
        if (data.guests) {
          setGuests(prev => mergeGuests(prev, data.guests));
        }
      })
      .catch(err => {
        console.warn('Firestore load error, checking server fallback:', err);
        // Fallback to Express backend if Firestore fails
        fetch('/api/db')
          .then(res => res.json())
          .then(res => {
            if (res.success && res.data && isMounted) {
              if (res.data.properties && Array.isArray(res.data.properties)) {
                setProperties(res.data.properties);
              }
              if (res.data.rooms && Array.isArray(res.data.rooms) && res.data.rooms.length > 0) {
                setRooms(res.data.rooms);
              }
              if (res.data.bookings && Array.isArray(res.data.bookings)) {
                setBookings(prev => mergeBookings(prev, res.data.bookings));
              }
              if (res.data.guests && Array.isArray(res.data.guests)) {
                setGuests(prev => mergeGuests(prev, res.data.guests));
              }
            }
          })
          .catch(e => console.warn('Server database fallback failed:', e));
      })
      .finally(() => {
        if (isMounted) {
          setIsDbLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Prefills for New Booking Wizard
  const [prefilledRoomId, setPrefilledRoomId] = useState<string | undefined>();
  const [prefilledCheckIn, setPrefilledCheckIn] = useState<string | undefined>();

  // Selected Booking for detail voucher view
  const [selectedBookingForVoucher, setSelectedBookingForVoucher] = useState<Booking | null>(null);

  // Selected Booking for Check-Out Bill Adjustment Popup
  const [checkoutTargetBooking, setCheckoutTargetBooking] = useState<Booking | null>(null);

  // Save changes to Cloud Firestore, LocalStorage, and Express Server DB
  useEffect(() => {
    if (!isDbLoaded) return;

    try {
      localStorage.setItem('homestay_properties', JSON.stringify(properties));
      localStorage.setItem('homestay_selected_property_id', selectedPropertyId);
      localStorage.setItem('homestay_rooms', JSON.stringify(rooms));
      localStorage.setItem('homestay_bookings', JSON.stringify(bookings));
      localStorage.setItem('homestay_guests', JSON.stringify(guests));
    } catch (quotaErr) {
      console.warn('LocalStorage quota limit reached:', quotaErr);
    }

    // Persistent debounced sync to Cloud Firestore to conserve daily write quota
    const syncTimer = setTimeout(() => {
      syncAllToFirestore(rooms, bookings, guests, properties).catch(err => {
        console.warn('Firestore background sync notice:', err);
      });
    }, 2500);

    // Sync to Express server in-memory/file storage for server-side AI routes
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties, rooms, bookings, guests })
    }).catch(err => console.warn('Failed to sync with server database:', err));

    return () => clearTimeout(syncTimer);
  }, [properties, selectedPropertyId, rooms, bookings, guests, isDbLoaded]);

  // Operational Handlers
  const handleCheckIn = (bookingId: string) => {
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, status: 'checked_in' } : b))
    );
  };

  const handleCheckOut = (bookingId: string) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (targetBooking) {
      setCheckoutTargetBooking(targetBooking);
    }
  };

  const handleConfirmCheckOut = (
    bookingId: string,
    paymentMethod: 'Cash' | 'Online',
    reference?: string
  ) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return;

    // Update booking: adjust balance to 0 (paid in full), set paymentStatus='Paid', record payment method, set status='checked_out'
    setBookings(prev =>
      prev.map(b => {
        if (b.id !== bookingId) return b;
        return {
          ...b,
          status: 'checked_out',
          paymentStatus: 'Paid',
          advanceAmount: b.totalAmount, // Bill fully adjusted
          paymentMethod,
          paymentReference: reference || b.paymentReference,
          checkedOutAt: new Date().toISOString()
        };
      })
    );

    sendHousekeepingTelegramReminder(targetBooking, rooms)
      .then(res => {
        if (res.success) {
          setToastAlert({
            type: 'success',
            message: `Check-out completed for ${targetBooking.guestName}! Bill adjusted via ${paymentMethod}. Housekeeping Telegram alert sent 🧹`
          });
        } else {
          setToastAlert({
            type: 'info',
            message: `Check-out completed for ${targetBooking.guestName}! Bill adjusted via ${paymentMethod}. ${res.message}`
          });
        }
      })
      .catch(err => {
        console.warn('Telegram checkout notification error:', err);
        setToastAlert({
          type: 'success',
          message: `Check-out completed for ${targetBooking.guestName}! Bill adjusted via ${paymentMethod}.`
        });
      });

    setTimeout(() => {
      setToastAlert(null);
    }, 6000);

    setCheckoutTargetBooking(null);
  };

  const handleModifyBooking = (updatedBooking: Booking) => {
    setBookings(prev =>
      prev.map(b => (b.id === updatedBooking.id ? updatedBooking : b))
    );
  };

  const handleCancelBooking = (bookingId: string, reason: string) => {
    setBookings(prev =>
      prev.map(b =>
        b.id === bookingId
          ? {
              ...b,
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
              cancellationReason: reason
            }
          : b
      )
    );
  };

  // Property Handlers
  const handleAddProperty = (newProp: Property) => {
    setProperties(prev => [...prev, newProp]);
  };

  const handleUpdateProperty = (updated: Property) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteProperty = (propId: string) => {
    if (propId === 'p-nohshring') {
      alert('Primary property Nohshring Homestay cannot be deleted.');
      return;
    }
    setProperties(prev => prev.filter(p => p.id !== propId));
    if (selectedPropertyId === propId) {
      setSelectedPropertyId('p-nohshring');
    }
  };

  const handleBookingCreated = (newBooking: Booking) => {
    const bookingWithProp: Booking = {
      ...newBooking,
      propertyId: newBooking.propertyId || activePropertyId
    };

    // 1. Immediately update bookings state and LocalStorage
    setBookings(prevBookings => {
      const updatedBookings = [bookingWithProp, ...prevBookings];
      try {
        localStorage.setItem('homestay_bookings', JSON.stringify(updatedBookings));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }
      return updatedBookings;
    });

    // 2. Immediately update or create guest profile with strict phone/email/name matching
    setGuests(prevGuests => {
      const targetMob = normalizeMobile(newBooking.guestMobile);
      const targetEmail = (newBooking.guestEmail || '').trim().toLowerCase();
      const targetName = (newBooking.guestName || '').trim().toLowerCase();

      const existingIndex = prevGuests.findIndex(g => {
        const gMob = normalizeMobile(g.mobile);
        const gEmail = (g.email || '').trim().toLowerCase();
        const gName = (g.name || '').trim().toLowerCase();

        if (targetMob && gMob && targetMob === gMob) return true;
        if (targetEmail && gEmail && targetEmail === gEmail) return true;
        if (targetName && gName && targetName === gName) return true;
        return false;
      });

      let updatedGuests: GuestProfile[];
      let targetGuest: GuestProfile;

      if (existingIndex !== -1) {
        updatedGuests = prevGuests.map((g, idx) => {
          if (idx !== existingIndex) return g;
          targetGuest = {
            ...g,
            name: g.name || newBooking.guestName,
            mobile: g.mobile || newBooking.guestMobile,
            email: g.email || newBooking.guestEmail,
            totalStays: (g.totalStays || 0) + 1,
            totalNights: (g.totalNights || 0) + newBooking.nights,
            totalSpend: (g.totalSpend || 0) + newBooking.totalAmount,
            lastStayDate: newBooking.checkInDate || g.lastStayDate
          };
          return targetGuest;
        });
      } else {
        targetGuest = {
          id: `guest-${Date.now()}`,
          name: newBooking.guestName || 'Guest',
          mobile: newBooking.guestMobile || '',
          email: newBooking.guestEmail || '',
          totalStays: 1,
          totalNights: newBooking.nights || 1,
          totalSpend: newBooking.totalAmount || 0,
          lastStayDate: newBooking.checkInDate || new Date().toISOString().split('T')[0],
          isVIP: false
        };
        updatedGuests = [targetGuest, ...prevGuests];
      }

      try {
        localStorage.setItem('homestay_guests', JSON.stringify(updatedGuests));
      } catch (e) {
        console.warn('LocalStorage guest save warning:', e);
      }

      // Immediately save single guest profile to Firestore
      if (targetGuest) {
        saveGuestToFirestore(targetGuest).catch(e => console.warn('Direct firestore guest save notice:', e));
      }

      return updatedGuests;
    });

    // 3. Save single booking directly to Firestore immediately (bypassing debounce)
    saveBookingToFirestore(bookingWithProp).catch(e => console.warn('Direct firestore booking save notice:', e));

    // 4. Sync immediately to server database
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties,
        rooms,
        bookings: [bookingWithProp, ...bookings],
        guests
      })
    }).catch(err => console.warn('Immediate server sync notice:', err));
  };

  // Room Management Handlers
  const handleAddRoom = (newRoom: Room) => {
    const roomWithProp = {
      ...newRoom,
      propertyId: newRoom.propertyId || activePropertyId
    };
    setRooms(prev => [...prev, roomWithProp]);
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms(prev => prev.map(r => (r.id === updatedRoom.id ? updatedRoom : r)));
  };

  const handleToggleRoomStatus = (roomId: string) => {
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, status: r.status === 'active' ? 'deactivated' : 'active' }
          : r
      )
    );
  };

  const handleArchiveRoom = (roomId: string) => {
    setRooms(prev =>
      prev.map(r => (r.id === roomId ? { ...r, status: 'archived' } : r))
    );
  };

  const handleUpdateGuest = (updatedGuest: GuestProfile) => {
    setGuests(prev => prev.map(g => (g.id === updatedGuest.id ? updatedGuest : g)));
  };

  const handleClearAllBookings = () => {
    if (confirm('Are you sure you want to clear all booking records? This will also clear guest CRM profiles.')) {
      setBookings([]);
      setGuests([]);
      localStorage.setItem('homestay_bookings', '[]');
      localStorage.setItem('homestay_guests', '[]');
      clearAllBookingsFromFirestore();
      fetch('/api/db/bookings', { method: 'DELETE' }).catch(err => console.error(err));
    }
  };

  const handleLoadSampleData = async () => {
    const freshBookings = generateInitialBookings();
    const freshGuests = generateInitialGuests();
    setBookings(freshBookings);
    setGuests(freshGuests);
    localStorage.setItem('homestay_bookings', JSON.stringify(freshBookings));
    localStorage.setItem('homestay_guests', JSON.stringify(freshGuests));
    try {
      await syncAllToFirestore(rooms, freshBookings, freshGuests, properties);
    } catch (e) {
      console.warn('Sync sample data warning:', e);
    }
    setToastAlert({ message: 'Sample bookings spread across the calendar!', type: 'success' });
  };

  const handleResetData = () => {
    const pin = prompt('Admin Authorization Required: Enter Admin Security PIN (Default: 1234)');
    if (pin === '1234') {
      localStorage.removeItem('homestay_rooms');
      localStorage.removeItem('homestay_bookings');
      localStorage.removeItem('homestay_guests');
      setRooms(INITIAL_ROOMS);
      setBookings(INITIAL_BOOKINGS);
      setGuests(INITIAL_GUESTS);
    } else if (pin !== null) {
      alert('Incorrect Admin PIN. Reset cancelled.');
    }
  };

  const handleExportData = () => {
    const data = { rooms, bookings, guests, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noahsring_homestay_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleSelectCellBooking = (room: Room, dateStr: string) => {
    setPrefilledRoomId(room.id);
    setPrefilledCheckIn(dateStr);
    setActiveTab('wizard');
  };

  const activeRoomsCount = filteredRooms.filter(r => r.status === 'active').length;
  const totalRoomsCount = filteredRooms.filter(r => r.status !== 'archived').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white pb-12">
      {/* Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={tab => {
          if (tab !== 'wizard') {
            setPrefilledRoomId(undefined);
            setPrefilledCheckIn(undefined);
          }
          setActiveTab(tab);
        }}
        activeRoomsCount={activeRoomsCount}
        totalRoomsCount={totalRoomsCount}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={id => setSelectedPropertyId(id)}
        openPropertyManager={() => setPropertyModalOpen(true)}
        openAiAssistant={() => setAiAssistantOpen(true)}
        openTelegramSettings={() => setTelegramModalOpen(true)}
        openSystemDocs={() => setSystemDocsModalOpen(true)}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onQuickNewBooking={() => {
          setPrefilledRoomId(undefined);
          setPrefilledCheckIn(undefined);
          setActiveTab('wizard');
        }}
      />

      {/* Floating Toast Alert Banner */}
      {toastAlert && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              toastAlert.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : toastAlert.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🧹</span>
              <p className="leading-snug">{toastAlert.message}</p>
            </div>
            <button
              onClick={() => setToastAlert(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}


      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <OccupancyDashboard
            rooms={filteredRooms}
            bookings={filteredBookings}
            guests={guests}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onNewBooking={() => setActiveTab('wizard')}
            onViewBookingDetails={booking => {
              setSelectedBookingForVoucher(booking);
              setActiveTab('bookings');
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            rooms={filteredRooms}
            bookings={filteredBookings}
            onSelectCellBooking={handleSelectCellBooking}
            onViewBookingDetails={booking => {
              setSelectedBookingForVoucher(booking);
              setActiveTab('bookings');
            }}
            onLoadSampleData={handleLoadSampleData}
          />
        )}

        {activeTab === 'wizard' && (
          <BookingWizard
            rooms={filteredRooms}
            bookings={filteredBookings}
            prefilledRoomId={prefilledRoomId}
            prefilledCheckIn={prefilledCheckIn}
            onBookingCreated={handleBookingCreated}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingList
            rooms={filteredRooms}
            bookings={filteredBookings}
            properties={properties}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onModifyBooking={handleModifyBooking}
            onCancelBooking={handleCancelBooking}
            onNewBookingClick={() => setActiveTab('wizard')}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomManagement
            rooms={filteredRooms}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onToggleRoomStatus={handleToggleRoomStatus}
            onArchiveRoom={handleArchiveRoom}
          />
        )}

        {activeTab === 'revenue' && (
          <RevenueDashboard rooms={filteredRooms} bookings={filteredBookings} />
        )}

        {activeTab === 'guests' && (
          <GuestCRM
            guests={guests}
            bookings={filteredBookings}
            rooms={filteredRooms}
            onUpdateGuest={handleUpdateGuest}
          />
        )}
      </main>

      {/* Property Manager Portfolio Modal */}
      {propertyModalOpen && (
        <PropertyManagerModal
          properties={properties}
          rooms={rooms}
          bookings={bookings}
          selectedPropertyId={selectedPropertyId}
          onSelectProperty={id => setSelectedPropertyId(id)}
          onAddProperty={handleAddProperty}
          onUpdateProperty={handleUpdateProperty}
          onDeleteProperty={handleDeleteProperty}
          onClose={() => setPropertyModalOpen(false)}
        />
      )}

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        rooms={rooms}
        bookings={bookings}
        onAutoFillBooking={prefill => {
          setPrefilledRoomId(prefill.roomId);
          setPrefilledCheckIn(prefill.checkIn);
          setActiveTab('wizard');
          setAiAssistantOpen(false);
        }}
      />

      {/* Telegram Housekeeping Settings Modal */}
      <TelegramSettingsModal
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
      />

      {/* System Documentation & Architecture PDF Modal */}
      <SystemDocPdfModal
        isOpen={systemDocsModalOpen}
        onClose={() => setSystemDocsModalOpen(false)}
      />

      {/* Guest Check-Out & Bill Settlement Modal */}
      {checkoutTargetBooking && (
        <CheckOutModal
          booking={checkoutTargetBooking}
          rooms={rooms}
          properties={properties}
          onConfirmCheckOut={handleConfirmCheckOut}
          onClose={() => setCheckoutTargetBooking(null)}
        />
      )}

      {/* Login & Tenant Role Authentication Modal */}
      <LoginModal
        properties={properties}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
