import React, { useState } from 'react';
import { GuestProfile, Booking, Room } from '../../types';
import { formatCurrency, formatDateReadable, getWhatsAppShareUrl } from '../../utils/bookingUtils';
import {
  Users,
  Search,
  Star,
  Phone,
  Mail,
  MessageSquare,
  History,
  Edit,
  Eye,
  X,
  Calendar,
  Home,
  CreditCard,
  Utensils,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Building,
  Tag
} from 'lucide-react';

interface GuestCRMProps {
  guests: GuestProfile[];
  bookings: Booking[];
  rooms?: Room[];
  onUpdateGuest: (guest: GuestProfile) => void;
}

// Helper to extract 10-digit normalized phone for matching
const normalizeMobile = (m?: string): string => {
  if (!m) return '';
  const digits = m.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export const GuestCRM: React.FC<GuestCRMProps> = ({ guests = [], bookings = [], rooms = [], onUpdateGuest }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingGuest, setEditingGuest] = useState<GuestProfile | null>(null);
  const [selectedGuestForDetails, setSelectedGuestForDetails] = useState<GuestProfile | null>(null);

  const [preferences, setPreferences] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isVIP, setIsVIP] = useState<boolean>(false);

  // Helper to resolve room names for a booking
  const getBookingRoomNames = (b: Booking): string => {
    if (b.roomIds && b.roomIds.length > 0) {
      const matched = rooms.filter(r => b.roomIds?.includes(r.id));
      if (matched.length > 0) {
        return matched.map(r => `${r.name} (${r.roomNumber})`).join(', ');
      }
    }
    const singleRoom = rooms.find(r => r.id === b.roomId);
    return singleRoom ? `${singleRoom.name} (${singleRoom.roomNumber})` : 'Assigned Room';
  };

  // Helper to filter bookings matching a specific guest
  const getGuestBookings = (guest: GuestProfile): Booking[] => {
    return bookings
      .filter(b => {
        const bMob = normalizeMobile(b.guestMobile);
        const gMob = normalizeMobile(guest.mobile);
        if (bMob && gMob && bMob === gMob) return true;
        if (b.guestName && guest.name && b.guestName.trim().toLowerCase() === guest.name.trim().toLowerCase()) return true;
        if (b.guestEmail && guest.email && b.guestEmail.trim().toLowerCase() === guest.email.trim().toLowerCase()) return true;
        return false;
      })
      .sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());
  };

  // Synthesize missing guest profiles dynamically from bookings if any booking guest isn't in guests list
  const mergedGuests = React.useMemo(() => {
    const result = [...guests];

    bookings.forEach(b => {
      if (!b.guestName && !b.guestMobile) return;
      const bMob = normalizeMobile(b.guestMobile);
      const bName = (b.guestName || '').trim().toLowerCase();

      const exists = result.some(g => {
        const gMob = normalizeMobile(g.mobile);
        const gName = (g.name || '').trim().toLowerCase();
        if (bMob && gMob && bMob === gMob) return true;
        if (bName && gName && bName === gName) return true;
        return false;
      });

      if (!exists) {
        const isCancelled = b.status === 'cancelled';
        result.push({
          id: `guest-synth-${b.id}`,
          name: b.guestName || 'Guest',
          mobile: b.guestMobile || '',
          email: b.guestEmail || '',
          totalStays: isCancelled ? 0 : 1,
          totalNights: isCancelled ? 0 : (b.nights || 1),
          totalSpend: isCancelled ? 0 : (b.totalAmount || 0),
          lastStayDate: b.checkInDate || new Date().toISOString().split('T')[0],
          isVIP: false
        });
      }
    });

    return result;
  }, [guests, bookings]);

  const openEditModal = (guest: GuestProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingGuest(guest);
    setPreferences(guest.preferences || '');
    setNotes(guest.notes || '');
    setIsVIP(guest.isVIP);
  };

  const handleSaveGuest = () => {
    if (!editingGuest) return;
    const updated: GuestProfile = {
      ...editingGuest,
      preferences,
      notes,
      isVIP
    };
    onUpdateGuest(updated);

    // If currently inspecting this guest in details modal, sync state
    if (selectedGuestForDetails && selectedGuestForDetails.id === editingGuest.id) {
      setSelectedGuestForDetails(updated);
    }

    setEditingGuest(null);
  };

  const filteredGuests = mergedGuests.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const qClean = q.replace(/\D/g, '');
    const gMob = (g.mobile || '').toLowerCase();
    const gClean = normalizeMobile(g.mobile);

    return (
      g.name.toLowerCase().includes(q) ||
      gMob.includes(q) ||
      (qClean.length >= 3 && gClean.includes(qClean)) ||
      (g.email && g.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Guest CRM & Relationship Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View detailed guest profiles, past booking histories, VIP status, and preferences
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guest name, phone, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Guest Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGuests.map(guest => {
          const guestBookings = getGuestBookings(guest);
          const activeGuestBookings = guestBookings.filter(b => b.status !== 'cancelled');

          const totalStaysCalc = Math.max(guest.totalStays || 0, activeGuestBookings.length);
          const totalNightsCalc = activeGuestBookings.length > 0
            ? activeGuestBookings.reduce((sum, b) => sum + (b.nights || 1), 0)
            : (activeGuestBookings.length === 0 && guestBookings.length > 0 ? 0 : (guest.totalNights || 1));
          const totalSpendCalc = activeGuestBookings.length > 0
            ? activeGuestBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
            : (activeGuestBookings.length === 0 && guestBookings.length > 0 ? 0 : (guest.totalSpend || 0));

          const waMsg = `Hi ${guest.name}, greetings from Noahsring Homestay! Thank you for visiting us . Please share your reviews here : https://maps.app.goo.gl/a8NkYNPxiGnYsa9R8`;
          const whatsappUrl = getWhatsAppShareUrl(guest.mobile, waMsg);

          return (
            <div
              key={guest.id}
              className={`rounded-2xl border transition p-5 space-y-4 flex flex-col justify-between cursor-pointer group shadow-xs ${
                guest.isVIP
                  ? 'bg-amber-50/40 border-amber-300/80 hover:border-amber-400 hover:shadow-md'
                  : 'bg-white border-slate-200 hover:shadow-md'
              }`}
              onClick={() => setSelectedGuestForDetails(guest)}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition">{guest.name}</h3>
                      {guest.isVIP && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {guest.mobile || 'No Phone Recorded'}
                    </p>
                    {guest.email && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400" /> {guest.email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = { ...guest, isVIP: !guest.isVIP };
                        onUpdateGuest(updated);
                        if (selectedGuestForDetails?.id === guest.id) {
                          setSelectedGuestForDetails(updated);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-xl flex items-center gap-1 transition ${
                        guest.isVIP
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border border-slate-200'
                      }`}
                      title={guest.isVIP ? "Click to remove VIP status" : "Click to mark guest as VIP"}
                    >
                      <Star className={`w-3.5 h-3.5 ${guest.isVIP ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                      <span className="hidden sm:inline">{guest.isVIP ? 'VIP' : 'Mark VIP'}</span>
                    </button>

                    <button
                      onClick={(e) => openEditModal(guest, e)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Notes & VIP Status"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Stays</span>
                    <p className="text-sm font-extrabold text-slate-800">{totalStaysCalc}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Nights</span>
                    <p className="text-sm font-extrabold text-slate-800">{totalNightsCalc}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Spend</span>
                    <p className="text-xs font-extrabold text-emerald-700">{formatCurrency(totalSpendCalc)}</p>
                  </div>
                </div>

                {/* Preferences & Notes */}
                {(guest.preferences || guest.notes) && (
                  <div className="mt-3 text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 space-y-1">
                    {guest.preferences && (
                      <p><strong>Preferences:</strong> {guest.preferences}</p>
                    )}
                    {guest.notes && (
                      <p className="text-slate-500"><strong>Notes:</strong> {guest.notes}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedGuestForDetails(guest)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Details & History</span>
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <span className="text-[10px] text-slate-400 shrink-0">
                  Last: {formatDateReadable(guest.lastStayDate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: VIEW GUEST DETAILS & PAST BOOKING HISTORY */}
      {selectedGuestForDetails && (() => {
        const guest = selectedGuestForDetails;
        const guestBookings = getGuestBookings(guest);
        const activeGuestBookings = guestBookings.filter(b => b.status !== 'cancelled');

        const totalStaysCalc = Math.max(guest.totalStays || 0, activeGuestBookings.length);
        const totalNightsCalc = activeGuestBookings.length > 0
          ? activeGuestBookings.reduce((sum, b) => sum + (b.nights || 1), 0)
          : (activeGuestBookings.length === 0 && guestBookings.length > 0 ? 0 : (guest.totalNights || 1));
        const totalSpendCalc = activeGuestBookings.length > 0
          ? activeGuestBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
          : (activeGuestBookings.length === 0 && guestBookings.length > 0 ? 0 : (guest.totalSpend || 0));

        const waMsg = `Hi ${guest.name}, greetings from Noahsring Homestay! Thank you for visiting us . Please share your reviews here : https://maps.app.goo.gl/a8NkYNPxiGnYsa9R8`;
        const whatsappUrl = getWhatsAppShareUrl(guest.mobile, waMsg);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 my-auto">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-lg">
                    {guest.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{guest.name}</h3>
                      {guest.isVIP && (
                        <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 text-[10px] font-black rounded-full flex items-center gap-1 shadow-xs">
                          <Star className="w-3 h-3 fill-amber-950" /> VIP GUEST
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                      {guest.mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" /> {guest.mobile}
                        </span>
                      )}
                      {guest.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-emerald-400" /> {guest.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(guest)}
                    className="p-2 bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition text-xs flex items-center gap-1.5"
                    title="Edit Preferences & VIP Tag"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Notes</span>
                  </button>
                  <button
                    onClick={() => setSelectedGuestForDetails(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 overflow-y-auto space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Stays</span>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{totalStaysCalc}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Nights</span>
                    <p className="text-xl font-black text-slate-800 mt-0.5">{totalNightsCalc}</p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Spend</span>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">{formatCurrency(totalSpendCalc)}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Visit</span>
                    <p className="text-xs font-bold text-slate-800 mt-1.5">{formatDateReadable(guest.lastStayDate)}</p>
                  </div>
                </div>

                {/* Guest Preferences & Notes Section */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      Guest Preferences & Owner Notes
                    </h4>
                    <button
                      onClick={() => openEditModal(guest)}
                      className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {guest.preferences ? (
                    <p className="text-xs text-slate-700">
                      <strong>Preferences:</strong> {guest.preferences}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific preferences recorded yet.</p>
                  )}
                  {guest.notes && (
                    <p className="text-xs text-slate-600 border-t border-amber-200/50 pt-1.5 mt-1.5">
                      <strong>Staff Notes:</strong> {guest.notes}
                    </p>
                  )}
                </div>

                {/* Past & Active Bookings Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-4 h-4 text-emerald-600" />
                      Booking History ({guestBookings.length} Records)
                    </h4>
                  </div>

                  {guestBookings.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">No matching detailed bookings found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        This guest profile was synced from legacy or manual entry.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {guestBookings.map(b => {
                        const roomLabel = getBookingRoomNames(b);
                        const advance = b.advanceAmount || 0;
                        const dueBalance = Math.max(0, b.totalAmount - advance);
                        const fnbTotal = b.foodAndBeverageCharges || 0;

                        let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                        let statusIcon = <Clock className="w-3 h-3" />;

                        if (b.status === 'checked_in') {
                          statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                          statusIcon = <CheckCircle className="w-3 h-3 text-emerald-600" />;
                        } else if (b.status === 'confirmed') {
                          statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                          statusIcon = <Clock className="w-3 h-3 text-blue-600" />;
                        } else if (b.status === 'checked_out') {
                          statusBadgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                          statusIcon = <CheckCircle className="w-3 h-3 text-indigo-600" />;
                        } else if (b.status === 'cancelled') {
                          statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                          statusIcon = <XCircle className="w-3 h-3 text-rose-600" />;
                        }

                        return (
                          <div
                            key={b.id}
                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 hover:border-slate-300 transition"
                          >
                            {/* Booking Top Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-extrabold text-slate-800">{b.bookingNumber}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({b.confirmationCode})</span>
                                <span className={`px-2.5 py-0.5 border text-[10px] font-black rounded-full flex items-center gap-1 ${statusBadgeClass}`}>
                                  {statusIcon}
                                  <span className="uppercase">{b.status.replace('_', ' ')}</span>
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-black text-emerald-700">{formatCurrency(b.totalAmount)}</span>
                                <span className="text-[10px] text-slate-400 block">{b.paymentStatus}</span>
                              </div>
                            </div>

                            {/* Stay Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="space-y-1">
                                <p className="text-slate-700 flex items-center gap-1.5">
                                  <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <strong className="text-slate-800">{roomLabel}</strong>
                                </p>
                                <p className="text-slate-500 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{formatDateReadable(b.checkInDate)} → {formatDateReadable(b.checkOutDate)}</span>
                                  <span className="font-semibold text-slate-700">({b.nights} Nights)</span>
                                </p>
                              </div>

                              <div className="space-y-1 sm:text-right">
                                <p className="text-slate-600">
                                  Guests: <strong>{b.numberOfGuests} Person(s)</strong> • Source: <strong>{b.bookingSource}</strong>
                                </p>
                                <p className="text-slate-500">
                                  Advance Paid: <strong className="text-emerald-700">{formatCurrency(advance)}</strong>
                                  {dueBalance > 0 && (
                                    <span className="ml-2 text-rose-600">
                                      Due: <strong>{formatCurrency(dueBalance)}</strong>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Food & Beverage Items Summary if any */}
                            {b.foodAndBeverageItems && b.foodAndBeverageItems.length > 0 && (
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1">
                                  <span className="flex items-center gap-1 text-slate-700">
                                    <Utensils className="w-3 h-3 text-amber-600" /> Room Service / F&B Orders
                                  </span>
                                  <span className="text-amber-800">{formatCurrency(fnbTotal)}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-600 pt-0.5">
                                  {b.foodAndBeverageItems.map(item => (
                                    <div key={item.id} className="flex justify-between">
                                      <span>• {item.name} × {item.qty}</span>
                                      <span className="font-semibold">{formatCurrency(item.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Cancellation Note */}
                            {b.status === 'cancelled' && b.cancellationReason && (
                              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100">
                                <strong>Cancellation Reason:</strong> {b.cancellationReason}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Greeting</span>
                </a>

                <button
                  onClick={() => setSelectedGuestForDetails(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: EDIT GUEST */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">Edit Guest Profile: {editingGuest.name}</h3>

            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVIP}
                  onChange={e => setIsVIP(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                <span>Mark Guest as VIP / Repeat Special Visitor</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Preferences</label>
                <textarea
                  rows={2}
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                  placeholder="e.g. High floor, ground floor, extra pillows..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Internal notes for staff..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingGuest(null)}
                className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGuest}
                className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

