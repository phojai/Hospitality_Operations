import React, { useState } from 'react';
import { Room, Booking, BookingStatus, Property } from '../../types';
import {
  formatCurrency,
  formatDateReadable,
  isRoomAvailableForDates,
  calculateNights,
  getBookingRoomNames,
  generateBookingShareText,
  getWhatsAppShareUrl,
  getTodayIST
} from '../../utils/bookingUtils';
import {
  Search,
  Filter,
  LogIn,
  LogOut,
  XCircle,
  Edit3,
  FileText,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Printer,
  CheckCircle,
  MessageSquare,
  Trash2,
  Share2,
  Copy,
  Check,
  Lock,
  ShieldAlert,
  Utensils,
  Receipt,
  Coffee,
  Clock,
  Flame,
  ChefHat
} from 'lucide-react';
import { FoodAndBeverageModal } from './FoodAndBeverageModal';
import { BookingBillModal } from './BookingBillModal';
import { KitchenAndGasModal } from './KitchenAndGasModal';

interface BookingListProps {
  rooms: Room[];
  bookings: Booking[];
  properties?: Property[];
  onCheckIn: (bookingId: string) => void;
  onCheckOut: (bookingId: string) => void;
  onModifyBooking: (updatedBooking: Booking) => void;
  onCancelBooking: (bookingId: string, reason: string) => void;
  onNewBookingClick: () => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  rooms = [],
  bookings = [],
  properties = [],
  onCheckIn,
  onCheckOut,
  onModifyBooking,
  onCancelBooking,
  onNewBookingClick
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [selectedVoucherBooking, setSelectedVoucherBooking] = useState<Booking | null>(null);
  const [selectedFbBooking, setSelectedFbBooking] = useState<Booking | null>(null);
  const [selectedKitchenAndGasBooking, setSelectedKitchenAndGasBooking] = useState<Booking | null>(null);
  const [selectedBillBooking, setSelectedBillBooking] = useState<Booking | null>(null);
  const [modifyModalBooking, setModifyModalBooking] = useState<Booking | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Guest plans changed');
  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null);

  const handleCopyShareText = (booking: Booking) => {
    const roomNames = getBookingRoomNames(booking, rooms);
    const adv = booking.advanceAmount !== undefined ? booking.advanceAmount : (booking.paymentStatus === 'Paid' ? booking.totalAmount : 0);
    const fbSummary = booking.foodAndBeverageItems && booking.foodAndBeverageItems.length > 0
      ? booking.foodAndBeverageItems.map(i => `${i.name} x${i.qty}`).join(', ')
      : undefined;
    const kgSummary = booking.kitchenAndGasItems && booking.kitchenAndGasItems.length > 0
      ? booking.kitchenAndGasItems.map(i => `${i.name} (${i.days || 1}d)`).join(', ')
      : undefined;

    const shareText = generateBookingShareText({
      bookingNumber: booking.bookingNumber,
      confirmationCode: booking.confirmationCode,
      guestName: booking.guestName,
      guestMobile: booking.guestMobile,
      roomNames,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      nights: booking.nights,
      totalAmount: booking.totalAmount,
      advanceAmount: adv,
      paymentStatus: booking.paymentStatus,
      discountAmount: booking.discountAmount,
      isGstExempt: booking.isGstExempt,
      extraBedCount: booking.extraBedCount,
      extraBedRatePerNight: booking.extraBedRatePerNight,
      extraBedAmount: booking.extraBedAmount,
      foodAndBeverageCharges: booking.foodAndBeverageCharges,
      foodAndBeverageItemsSummary: fbSummary,
      kitchenAndGasCharges: booking.kitchenAndGasCharges,
      kitchenAndGasItemsSummary: kgSummary
    });

    if (navigator.share) {
      navigator.share({
        title: `Nohshring Homestay Booking ${booking.bookingNumber}`,
        text: shareText
      }).catch(() => {
        navigator.clipboard.writeText(shareText);
        setCopiedBookingId(booking.id);
        setTimeout(() => setCopiedBookingId(null), 3000);
      });
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedBookingId(booking.id);
      setTimeout(() => setCopiedBookingId(null), 3000);
    }
  };

  // Modify Form State
  const [modGuestName, setModGuestName] = useState<string>('');
  const [modGuestMobile, setModGuestMobile] = useState<string>('');
  const [modCheckIn, setModCheckIn] = useState<string>('');
  const [modCheckOut, setModCheckOut] = useState<string>('');
  const [modRoomIds, setModRoomIds] = useState<string[]>([]);
  const [modGuests, setModGuests] = useState<number | ''>(2);
  const [modAdvance, setModAdvance] = useState<number>(0);
  const [modDiscount, setModDiscount] = useState<number>(0);
  const [modRemoveGst, setModRemoveGst] = useState<boolean>(false);
  const [modExtraBedCount, setModExtraBedCount] = useState<number>(0);
  const [modExtraBedRatePerNight, setModExtraBedRatePerNight] = useState<number>(500);
  const [modFbCharges, setModFbCharges] = useState<number>(0);
  const [modKitchenCharges, setModKitchenCharges] = useState<number>(0);
  const [modError, setModError] = useState<string>('');

  const openModifyModal = (booking: Booking) => {
    setModifyModalBooking(booking);
    setModGuestName(booking.guestName || '');
    setModGuestMobile(booking.guestMobile || '');
    setModCheckIn(booking.checkInDate);
    setModCheckOut(booking.checkOutDate);
    const initialRoomIds = booking.roomIds && booking.roomIds.length > 0 ? booking.roomIds : [booking.roomId];
    setModRoomIds(initialRoomIds);
    setModGuests(booking.numberOfGuests);
    setModAdvance(booking.advanceAmount !== undefined ? booking.advanceAmount : (booking.paymentStatus === 'Paid' ? booking.totalAmount : 0));
    setModDiscount(booking.discountAmount || 0);
    setModRemoveGst(booking.isGstExempt || false);
    setModExtraBedCount(booking.extraBedCount || 0);
    setModExtraBedRatePerNight(booking.extraBedRatePerNight || 500);
    setModFbCharges(booking.foodAndBeverageCharges || 0);
    setModKitchenCharges(booking.kitchenAndGasCharges || 0);
    setModError('');
  };

  const toggleModRoom = (roomId: string) => {
    setModRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSaveModify = () => {
    if (!modifyModalBooking) return;
    setModError('');

    if (!modGuestName.trim()) {
      setModError('Guest name cannot be empty.');
      return;
    }

    if (!modGuestMobile.trim()) {
      setModError('Guest mobile number cannot be empty.');
      return;
    }

    if (modRoomIds.length === 0) {
      setModError('Please select at least one room.');
      return;
    }

    const newNights = calculateNights(modCheckIn, modCheckOut);
    if (newNights <= 0) {
      setModError('Check-out date must be after check-in date.');
      return;
    }

    // Verify availability for all selected rooms
    for (const rid of modRoomIds) {
      const available = isRoomAvailableForDates(
        rid,
        modCheckIn,
        modCheckOut,
        bookings,
        modifyModalBooking.id
      );

      if (!available) {
        const rName = rooms.find(r => r.id === rid)?.name || rid;
        setModError(`Room "${rName}" is unavailable on these new dates.`);
        return;
      }
    }

    const selRooms = rooms.filter(r => modRoomIds.includes(r.id));
    const combinedBaseRate = selRooms.reduce((sum, r) => sum + r.pricePerNight, 0);
    const roomSubtotal = combinedBaseRate * newNights;
    const extraBedTotal = modExtraBedCount * modExtraBedRatePerNight * newNights;
    const subtotal = roomSubtotal + extraBedTotal + (modFbCharges || 0) + (modKitchenCharges || 0);
    const effectiveDiscount = Math.min(subtotal, modDiscount);
    const taxableAmount = Math.max(0, subtotal - effectiveDiscount);
    const taxAmount = modRemoveGst ? 0 : Math.round(taxableAmount * 0.05);
    const totalAmount = Math.max(0, taxableAmount + taxAmount);

    const finalAdvance = Math.max(0, Math.min(totalAmount, modAdvance));
    let paymentStatus = modifyModalBooking.paymentStatus;
    if (finalAdvance >= totalAmount) paymentStatus = 'Paid';
    else if (finalAdvance > 0) paymentStatus = 'Partial';
    else paymentStatus = 'Pending';

    const updated: Booking = {
      ...modifyModalBooking,
      guestName: modGuestName.trim(),
      guestMobile: modGuestMobile.trim(),
      roomId: selRooms[0].id,
      roomIds: modRoomIds,
      checkInDate: modCheckIn,
      checkOutDate: modCheckOut,
      numberOfGuests: typeof modGuests === 'number' ? modGuests : 0,
      nights: newNights,
      baseRatePerNight: combinedBaseRate,
      taxAmount,
      totalAmount,
      discountAmount: effectiveDiscount,
      isGstExempt: modRemoveGst,
      extraBedCount: modExtraBedCount,
      extraBedRatePerNight: modExtraBedRatePerNight,
      extraBedAmount: extraBedTotal,
      foodAndBeverageCharges: modFbCharges || 0,
      kitchenAndGasCharges: modKitchenCharges || 0,
      advanceAmount: finalAdvance,
      paymentStatus
    };

    onModifyBooking(updated);
    setModifyModalBooking(null);
  };

  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;
    onCancelBooking(cancelModalBooking.id, cancelReason);
    setCancelModalBooking(null);
  };

  const todayStr = getTodayIST();

  const filteredBookings = bookings.filter(b => {
    if (statusFilter === 'today') {
      const isTodayCheckIn = b.checkInDate === todayStr;
      const isTodayCheckOut = b.checkOutDate === todayStr;
      if (!isTodayCheckIn && !isTodayCheckOut) return false;
      if (b.status === 'cancelled') return false;
    } else if (statusFilter !== 'all' && b.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const roomNames = getBookingRoomNames(b, rooms).toLowerCase();
      return (
        b.guestName.toLowerCase().includes(q) ||
        b.guestMobile.includes(q) ||
        b.bookingNumber.toLowerCase().includes(q) ||
        b.confirmationCode.toLowerCase().includes(q) ||
        roomNames.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Reservation Master Records</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage, modify, check-in, or cancel guest reservations</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewBookingClick}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              + Create Booking
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center flex-wrap gap-2">
            {[
              { id: 'today', label: "Today's Check-in & Out" },
              { id: 'all', label: 'All Bookings' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'checked_in', label: 'In House' },
              { id: 'checked_out', label: 'Checked Out' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.id === 'today' && <Clock className="w-3.5 h-3.5 text-emerald-300" />}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guest, phone, or booking #"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">No reservations match the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Guest Info</th>
                  <th className="p-3.5">Room</th>
                  <th className="p-3.5">Stay Dates</th>
                  <th className="p-3.5">Amount & Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map(booking => {
                  const room = rooms.find(r => r.id === booking.roomId);

                  let statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Confirmed
                    </span>
                  );

                  if (booking.status === 'checked_in') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        In House
                      </span>
                    );
                  } else if (booking.status === 'checked_out') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        Checked Out
                      </span>
                    );
                  } else if (booking.status === 'cancelled') {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Cancelled
                      </span>
                    );
                  }

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/80 transition">
                      {/* Booking Ref */}
                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-slate-800 block">{booking.bookingNumber}</span>
                        <span className="text-[10px] text-slate-400">{booking.confirmationCode}</span>
                      </td>

                      {/* Guest Info */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-between gap-1 group">
                          <div>
                            <div className="font-bold text-slate-800">{booking.guestName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {booking.guestMobile}
                            </div>
                          </div>
                          {booking.status !== 'cancelled' && (
                            <button
                              onClick={() => openModifyModal(booking)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                              title="Edit Guest Name & Mobile Number"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Room */}
                      <td className="p-3.5">
                        <div className="font-bold text-emerald-800">{getBookingRoomNames(booking, rooms)}</div>
                        <div className="text-[10px] text-slate-500">
                          {booking.roomIds && booking.roomIds.length > 1
                            ? `${booking.roomIds.length} Rooms Booked`
                            : `Room #${room?.roomNumber || ''} • ${room?.type || ''}`}
                        </div>
                      </td>

                      {/* Stay Dates */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-700">
                          {formatDateReadable(booking.checkInDate)} → {formatDateReadable(booking.checkOutDate)}
                        </div>
                        <div className="text-[10px] text-slate-400">{booking.nights} Nights • {booking.numberOfGuests} Guests</div>
                      </td>

                      {/* Amount & Status */}
                      <td className="p-3.5">
                        {(() => {
                          const adv = booking.advanceAmount !== undefined ? booking.advanceAmount : (booking.paymentStatus === 'Paid' ? booking.totalAmount : 0);
                          const due = Math.max(0, booking.totalAmount - adv);
                          return (
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-slate-900">{formatCurrency(booking.totalAmount)}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <span>Adv: <strong className="text-emerald-700">{formatCurrency(adv)}</strong></span>
                                {due > 0 && <span className="text-amber-700 font-bold">• Due: {formatCurrency(due)}</span>}
                              </div>
                              <div className="mt-1">{statusBadge}</div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => setSelectedFbBooking(booking)}
                          className={`px-2.5 py-1 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer ${
                            booking.foodAndBeverageCharges && booking.foodAndBeverageCharges > 0
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Charge Food & Beverages / Room Service"
                        >
                          <Utensils className="w-3.5 h-3.5 text-amber-600" />
                          <span>F&B</span>
                          {booking.foodAndBeverageCharges && booking.foodAndBeverageCharges > 0 ? (
                            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-extrabold ml-0.5">
                              +{formatCurrency(booking.foodAndBeverageCharges)}
                            </span>
                          ) : null}
                        </button>

                        <button
                          onClick={() => setSelectedKitchenAndGasBooking(booking)}
                          className={`px-2.5 py-1 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer ${
                            booking.kitchenAndGasCharges && booking.kitchenAndGasCharges > 0
                              ? 'bg-orange-100 text-orange-950 hover:bg-orange-200 border border-orange-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Charge Kitchen & Gas Equipments"
                        >
                          <Flame className="w-3.5 h-3.5 text-orange-600" />
                          <span>Kitchen & Gas</span>
                          {booking.kitchenAndGasCharges && booking.kitchenAndGasCharges > 0 ? (
                            <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.2 rounded font-extrabold ml-0.5">
                              +{formatCurrency(booking.kitchenAndGasCharges)}
                            </span>
                          ) : null}
                        </button>

                        <button
                          onClick={() => setSelectedBillBooking(booking)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          title="Generate Tax Invoice & Bill"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-300" />
                          <span>Bill</span>
                        </button>

                        <button
                          onClick={() => {
                            const roomNames = getBookingRoomNames(booking, rooms);
                            const adv = booking.advanceAmount !== undefined ? booking.advanceAmount : (booking.paymentStatus === 'Paid' ? booking.totalAmount : 0);
                            const fbSummary = booking.foodAndBeverageItems && booking.foodAndBeverageItems.length > 0
                              ? booking.foodAndBeverageItems.map(i => `${i.name} x${i.qty}`).join(', ')
                              : undefined;
                            const kgSummary = booking.kitchenAndGasItems && booking.kitchenAndGasItems.length > 0
                              ? booking.kitchenAndGasItems.map(i => `${i.name} (${i.days || 1}d)`).join(', ')
                              : undefined;

                            const text = generateBookingShareText({
                              bookingNumber: booking.bookingNumber,
                              confirmationCode: booking.confirmationCode,
                              guestName: booking.guestName,
                              guestMobile: booking.guestMobile,
                              roomNames,
                              checkInDate: booking.checkInDate,
                              checkOutDate: booking.checkOutDate,
                              nights: booking.nights,
                              totalAmount: booking.totalAmount,
                              advanceAmount: adv,
                              paymentStatus: booking.paymentStatus,
                              discountAmount: booking.discountAmount,
                              isGstExempt: booking.isGstExempt,
                              extraBedCount: booking.extraBedCount,
                              extraBedRatePerNight: booking.extraBedRatePerNight,
                              extraBedAmount: booking.extraBedAmount,
                              foodAndBeverageCharges: booking.foodAndBeverageCharges,
                              foodAndBeverageItemsSummary: fbSummary,
                              kitchenAndGasCharges: booking.kitchenAndGasCharges,
                              kitchenAndGasItemsSummary: kgSummary
                            });
                            window.open(getWhatsAppShareUrl(booking.guestMobile, text), '_blank');
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                          title="Share Voucher on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => setSelectedVoucherBooking(booking)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                          title="Print / View Voucher"
                        >
                          Voucher
                        </button>

                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => onCheckIn(booking.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                          >
                            Check-In
                          </button>
                        )}

                        {booking.status === 'checked_in' && (
                          <button
                            onClick={() => onCheckOut(booking.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
                          >
                            Check-Out
                          </button>
                        )}

                        {booking.status !== 'cancelled' && booking.status !== 'checked_out' && (
                          <>
                            <button
                              onClick={() => openModifyModal(booking)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                              title="Modify Dates or Room"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => setCancelModalBooking(booking)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg transition"
                              title="Cancel Reservation"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: MODIFY RESERVATION */}
      {modifyModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Edit Reservation: {modifyModalBooking.bookingNumber}</h3>
              <button
                onClick={() => setModifyModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {modError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">{modError}</p>
            )}

            <div className="space-y-3">
              {/* Guest Details (Name & Mobile Number) */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
                <span className="text-xs font-bold text-emerald-900 block">Guest Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Guest Name</label>
                    <input
                      type="text"
                      value={modGuestName}
                      onChange={e => setModGuestName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={modGuestMobile}
                      onChange={e => setModGuestMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Room(s) for this Reservation ({modRoomIds.length} Selected)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {rooms.filter(r => r.status === 'active').map(r => {
                    const isChecked = modRoomIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleModRoom(r.id)}
                        className={`flex items-center space-x-2 p-2 rounded-lg text-xs font-medium cursor-pointer border transition ${
                          isChecked ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="truncate">{r.name} ({formatCurrency(r.pricePerNight)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-In Date</label>
                  <input
                    type="date"
                    value={modCheckIn}
                    onChange={e => setModCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-Out Date</label>
                  <input
                    type="date"
                    value={modCheckOut}
                    onChange={e => setModCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Guests</label>
                <input
                  type="number"
                  min={0}
                  value={modGuests}
                  placeholder="0"
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setModGuests('');
                    } else {
                      const parsed = parseInt(raw, 10);
                      setModGuests(isNaN(parsed) ? '' : Math.max(0, parsed));
                    }
                  }}
                  onBlur={() => {
                    if (modGuests === '') {
                      setModGuests(0);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                />
              </div>

              {/* Extra Bed Options */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-amber-900 block">Extra Bed Charges</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Extra Beds</label>
                    <select
                      value={modExtraBedCount}
                      onChange={e => setModExtraBedCount(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                    >
                      <option value={0}>0 Beds</option>
                      <option value={1}>1 Extra Bed</option>
                      <option value={2}>2 Extra Beds</option>
                      <option value={3}>3 Extra Beds</option>
                      <option value={4}>4 Extra Beds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rate / Bed / Night (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={modExtraBedRatePerNight || ''}
                      placeholder="500"
                      onChange={e => setModExtraBedRatePerNight(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Food & Beverage Charges Field */}
              <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    Food & Beverages / Room Service Charges (₹)
                  </label>
                  {modifyModalBooking && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = modifyModalBooking;
                        setModifyModalBooking(null);
                        setSelectedFbBooking(current);
                      }}
                      className="text-[10px] text-amber-800 hover:underline font-bold cursor-pointer"
                    >
                      Open Itemized F&B Menu →
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={modFbCharges === 0 ? '' : modFbCharges}
                  placeholder="0"
                  onChange={e => {
                    const raw = e.target.value;
                    setModFbCharges(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                />
              </div>

              {/* Kitchen & Gas Equipment Charges Field */}
              <div className="p-3 bg-orange-50/50 border border-orange-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-900 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-600" />
                    Kitchen & Gas Equipment Rental Charges (₹)
                  </label>
                  {modifyModalBooking && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = modifyModalBooking;
                        setModifyModalBooking(null);
                        setSelectedKitchenAndGasBooking(current);
                      }}
                      className="text-[10px] text-orange-800 hover:underline font-bold cursor-pointer"
                    >
                      Open Itemized Equipment Manager →
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  value={modKitchenCharges === 0 ? '' : modKitchenCharges}
                  placeholder="0"
                  onChange={e => {
                    const raw = e.target.value;
                    setModKitchenCharges(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={modDiscount === 0 ? '' : modDiscount}
                    onChange={e => {
                      const raw = e.target.value;
                      setModDiscount(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Option</label>
                  <button
                    type="button"
                    onClick={() => setModRemoveGst(!modRemoveGst)}
                    className={`w-full py-2 px-2 text-xs font-bold rounded-xl transition border text-center ${
                      modRemoveGst
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {modRemoveGst ? '✓ GST Waived (0%)' : 'Standard 5% GST'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Amount Paid (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={modAdvance === 0 ? '' : modAdvance}
                  placeholder="0"
                  onChange={e => {
                    const raw = e.target.value;
                    setModAdvance(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setModifyModalBooking(null)}
                className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModify}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL RESERVATION */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">Cancel Reservation?</h3>
            </div>

            <p className="text-xs text-slate-600">
              Cancelling <strong>{cancelModalBooking.bookingNumber}</strong> for <strong>{cancelModalBooking.guestName}</strong> will release the room inventory and make it immediately available on the calendar matrix.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE VOUCHER */}
      {selectedVoucherBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nohshring Homestay</h3>
                <p className="text-xs text-slate-500">Official Stay Confirmation Voucher</p>
              </div>
              <button
                onClick={() => setSelectedVoucherBooking(null)}
                className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between font-mono font-bold">
                <span>Booking ID: {selectedVoucherBooking.bookingNumber}</span>
                <span>Confirmation: {selectedVoucherBooking.confirmationCode}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 space-y-1">
                <p><strong>Guest Name:</strong> {selectedVoucherBooking.guestName}</p>
                <p><strong>Mobile:</strong> {selectedVoucherBooking.guestMobile}</p>
                <p><strong>Assigned Room(s):</strong> <span className="font-bold text-emerald-800">{getBookingRoomNames(selectedVoucherBooking, rooms)}</span></p>
                <p><strong>Stay Schedule:</strong> {formatDateReadable(selectedVoucherBooking.checkInDate)} to {formatDateReadable(selectedVoucherBooking.checkOutDate)} ({selectedVoucherBooking.nights} Nights)</p>
                {selectedVoucherBooking.extraBedCount && selectedVoucherBooking.extraBedCount > 0 ? (
                  <p className="text-amber-800 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200/60 inline-block my-1">
                    🛏️ <strong>Extra Bed Charges:</strong> {selectedVoucherBooking.extraBedCount} Bed(s) × {formatCurrency(selectedVoucherBooking.extraBedRatePerNight || 0)}/night = {formatCurrency(selectedVoucherBooking.extraBedAmount || 0)}
                  </p>
                ) : null}
                {selectedVoucherBooking.foodAndBeverageCharges && selectedVoucherBooking.foodAndBeverageCharges > 0 ? (
                  <p className="text-amber-900 font-semibold bg-amber-100/70 px-2 py-1 rounded border border-amber-300 inline-block my-1">
                    🍽️ <strong>Food & Beverages Charges:</strong> {formatCurrency(selectedVoucherBooking.foodAndBeverageCharges)}
                  </p>
                ) : null}
                {selectedVoucherBooking.discountAmount ? (
                  <p className="text-emerald-700"><strong>Discount Applied:</strong> -{formatCurrency(selectedVoucherBooking.discountAmount)}</p>
                ) : null}
                {selectedVoucherBooking.isGstExempt ? (
                  <p className="text-emerald-700 font-semibold"><strong>GST Status:</strong> Waived / Removed (0% Tax)</p>
                ) : (
                  <p className="text-slate-500"><strong>GST / Tax (5%):</strong> {formatCurrency(selectedVoucherBooking.taxAmount)}</p>
                )}
                <p><strong>Total Booking Amount:</strong> {formatCurrency(selectedVoucherBooking.totalAmount)}</p>
                {(() => {
                  const adv = selectedVoucherBooking.advanceAmount !== undefined ? selectedVoucherBooking.advanceAmount : (selectedVoucherBooking.paymentStatus === 'Paid' ? selectedVoucherBooking.totalAmount : 0);
                  const due = Math.max(0, selectedVoucherBooking.totalAmount - adv);
                  return (
                    <>
                      <p className="text-emerald-700"><strong>Advance Amount Paid:</strong> {formatCurrency(adv)}</p>
                      <p className="font-bold text-slate-800">
                        <strong>Balance Due at Check-In:</strong>{' '}
                        <span className={due > 0 ? 'text-amber-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                          {formatCurrency(due)}
                        </span>{' '}
                        ({selectedVoucherBooking.paymentStatus})
                      </p>
                      <div className="pt-2 mt-2 border-t border-slate-200 text-slate-600 text-[11px] space-y-0.5">
                        <p>📍 <strong>Property Address:</strong> Near Karbi Club, Umrangso, Dima Hasao, Assam</p>
                        <p>📞 <strong>Contact Helpline:</strong> +91 7086015740</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap justify-end items-center gap-2">
              <button
                onClick={() => {
                  const roomNames = getBookingRoomNames(selectedVoucherBooking, rooms);
                  const adv = selectedVoucherBooking.advanceAmount !== undefined ? selectedVoucherBooking.advanceAmount : (selectedVoucherBooking.paymentStatus === 'Paid' ? selectedVoucherBooking.totalAmount : 0);
                  const text = generateBookingShareText({
                    bookingNumber: selectedVoucherBooking.bookingNumber,
                    confirmationCode: selectedVoucherBooking.confirmationCode,
                    guestName: selectedVoucherBooking.guestName,
                    guestMobile: selectedVoucherBooking.guestMobile,
                    roomNames,
                    checkInDate: selectedVoucherBooking.checkInDate,
                    checkOutDate: selectedVoucherBooking.checkOutDate,
                    nights: selectedVoucherBooking.nights,
                    totalAmount: selectedVoucherBooking.totalAmount,
                    advanceAmount: adv,
                    paymentStatus: selectedVoucherBooking.paymentStatus,
                    discountAmount: selectedVoucherBooking.discountAmount,
                    isGstExempt: selectedVoucherBooking.isGstExempt,
                    extraBedCount: selectedVoucherBooking.extraBedCount,
                    extraBedRatePerNight: selectedVoucherBooking.extraBedRatePerNight,
                    extraBedAmount: selectedVoucherBooking.extraBedAmount
                  });
                  window.open(getWhatsAppShareUrl(selectedVoucherBooking.guestMobile, text), '_blank');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition"
              >
                <MessageSquare className="w-4 h-4" /> Share on WhatsApp
              </button>

              <button
                onClick={() => handleCopyShareText(selectedVoucherBooking)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                {copiedBookingId === selectedVoucherBooking.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-600" />
                    <span>Share / Copy Details</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const b = selectedVoucherBooking;
                  setSelectedVoucherBooking(null);
                  setSelectedBillBooking(b);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Receipt className="w-4 h-4" /> Generate Final Bill
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FOOD AND BEVERAGES MANAGER */}
      {selectedFbBooking && (
        <FoodAndBeverageModal
          booking={selectedFbBooking}
          rooms={rooms}
          onSave={(updated) => {
            onModifyBooking(updated);
            setSelectedFbBooking(null);
          }}
          onClose={() => setSelectedFbBooking(null)}
        />
      )}

      {/* MODAL: KITCHEN & GAS EQUIPMENT MANAGER */}
      {selectedKitchenAndGasBooking && (
        <KitchenAndGasModal
          booking={selectedKitchenAndGasBooking}
          rooms={rooms}
          onSave={(updated) => {
            onModifyBooking(updated);
            setSelectedKitchenAndGasBooking(null);
          }}
          onClose={() => setSelectedKitchenAndGasBooking(null)}
        />
      )}

      {/* MODAL: TAX INVOICE & FINAL BILL */}
      {selectedBillBooking && (
        <BookingBillModal
          booking={selectedBillBooking}
          rooms={rooms}
          properties={properties}
          onCheckOut={onCheckOut}
          onClose={() => setSelectedBillBooking(null)}
        />
      )}
    </div>
  );
};
