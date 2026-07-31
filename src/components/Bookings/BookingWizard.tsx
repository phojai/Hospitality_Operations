import React, { useState, useEffect } from 'react';
import { Room, Booking, BookingSource, PaymentStatus } from '../../types';
import {
  searchAvailability,
  calculateNights,
  formatCurrency,
  formatDateReadable,
  generateBookingIds,
  parseYMD,
  generateBookingShareText,
  getWhatsAppShareUrl,
  getTodayIST
} from '../../utils/bookingUtils';
import {
  CheckCircle,
  Calendar,
  Users,
  BedDouble,
  User,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Printer,
  Share2,
  Check,
  MessageSquare,
  Percent,
  Tag,
  BadgePercent
} from 'lucide-react';

interface BookingWizardProps {
  rooms: Room[];
  bookings: Booking[];
  prefilledRoomId?: string;
  prefilledCheckIn?: string;
  onBookingCreated: (booking: Booking) => void;
  onCancel: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  rooms = [],
  bookings = [],
  prefilledRoomId,
  prefilledCheckIn,
  onBookingCreated,
  onCancel
}) => {
  const [step, setStep] = useState<number>(1);

  // Step 1 Form State
  const [guestName, setGuestName] = useState<string>('');
  const [guestMobile, setGuestMobile] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [numberOfGuests, setNumberOfGuests] = useState<number | ''>(2);
  const [checkInDate, setCheckInDate] = useState<string>(prefilledCheckIn || getTodayIST());
  
  // Default checkOut to checkIn + 2 nights
  const defaultCheckOut = () => {
    const start = parseYMD(prefilledCheckIn || getTodayIST());
    start.setDate(start.getDate() + 2);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [checkOutDate, setCheckOutDate] = useState<string>(defaultCheckOut());
  const [bookingSource, setBookingSource] = useState<BookingSource>('Direct');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [removeGst, setRemoveGst] = useState<boolean>(false);
  const [extraBedCount, setExtraBedCount] = useState<number>(0);
  const [extraBedRatePerNight, setExtraBedRatePerNight] = useState<number>(500);
  const [kitchenAndGasCharges, setKitchenAndGasCharges] = useState<number>(0);
  const [kitchenAndGasNotes, setKitchenAndGasNotes] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Selected Rooms (allows 1 guest to book multiple rooms)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    prefilledRoomId ? [prefilledRoomId] : []
  );

  // Validation errors
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedInWizard, setCopiedInWizard] = useState<boolean>(false);
  const [createdBookingInfo, setCreatedBookingInfo] = useState<{ bookingNumber: string; confirmationCode: string } | null>(null);

  const nights = calculateNights(checkInDate, checkOutDate);

  // Search Results
  const searchResult = searchAvailability(
    rooms,
    bookings,
    checkInDate,
    checkOutDate,
    numberOfGuests === '' ? 0 : numberOfGuests
  );

  useEffect(() => {
    if (prefilledRoomId && searchResult.availableRooms.some(r => r.id === prefilledRoomId)) {
      if (!selectedRoomIds.includes(prefilledRoomId)) {
        setSelectedRoomIds([prefilledRoomId]);
      }
    }
  }, [prefilledRoomId]);

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const selectedRooms = rooms.filter(r => selectedRoomIds.includes(r.id));
  const combinedRatePerNight = selectedRooms.reduce((sum, r) => sum + r.pricePerNight, 0);
  const totalCombinedCapacity = selectedRooms.reduce((sum, r) => sum + r.capacity, 0);

  const roomSubtotal = combinedRatePerNight * nights;
  const extraBedTotal = extraBedCount * extraBedRatePerNight * nights;
  const subtotal = roomSubtotal + extraBedTotal + kitchenAndGasCharges;
  const standardGst = Math.round(subtotal * 0.05);
  const effectiveDiscount = Math.min(subtotal, discountAmount);
  const taxableAmount = Math.max(0, subtotal - effectiveDiscount);
  const taxAmount = removeGst ? 0 : Math.round(taxableAmount * 0.05);
  const totalAmount = Math.max(0, taxableAmount + taxAmount);

  const handleNextToStep2 = () => {
    setErrorMsg('');
    if (!guestName.trim()) {
      setErrorMsg('Please enter guest name.');
      return;
    }
    if (!guestMobile.trim()) {
      setErrorMsg('Please enter mobile number.');
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setErrorMsg('Please select check-in and check-out dates.');
      return;
    }
    if (nights <= 0) {
      setErrorMsg('Check-out date must be after check-in date.');
      return;
    }

    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (selectedRoomIds.length === 0) {
      setErrorMsg('Please select at least one room.');
      return;
    }
    setAdvanceAmount(totalAmount); // default full advance
    setPaymentStatus('Paid');
    setErrorMsg('');
    setStep(3);
  };

  const handleConfirmBooking = () => {
    if (selectedRooms.length === 0) return;

    const ids = generateBookingIds();

    // determine payment status based on advance amount
    let finalPaymentStatus: PaymentStatus = paymentStatus;
    if (advanceAmount >= totalAmount) {
      finalPaymentStatus = 'Paid';
    } else if (advanceAmount > 0) {
      finalPaymentStatus = 'Partial';
    } else {
      finalPaymentStatus = 'Pending';
    }

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      bookingNumber: ids.bookingNumber,
      confirmationCode: ids.confirmationCode,
      roomId: selectedRooms[0].id,
      roomIds: selectedRoomIds,
      guestName,
      guestMobile,
      guestEmail,
      numberOfGuests: numberOfGuests === '' ? 0 : numberOfGuests,
      checkInDate,
      checkOutDate,
      nights,
      baseRatePerNight: combinedRatePerNight,
      taxAmount,
      totalAmount,
      discountAmount: effectiveDiscount,
      isGstExempt: removeGst,
      extraBedCount,
      extraBedRatePerNight,
      extraBedAmount: extraBedTotal,
      kitchenAndGasCharges,
      kitchenAndGasItems: kitchenAndGasCharges > 0 ? [{
        id: `kg-${Date.now()}`,
        name: kitchenAndGasNotes.trim() || 'LPG Gas & Kitchen Equipment Rental',
        category: 'Gas Equipment',
        price: Math.round(kitchenAndGasCharges / (nights || 1)),
        qty: 1,
        days: nights || 1,
        amount: kitchenAndGasCharges
      }] : [],
      status: 'confirmed',
      bookingSource,
      paymentStatus: finalPaymentStatus,
      advanceAmount: Math.max(0, Math.min(totalAmount, advanceAmount)),
      specialRequests,
      createdAt: new Date().toISOString()
    };

    onBookingCreated(newBooking);
    setCreatedBookingInfo(ids);
    setStep(4);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Wizard Step Progress Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Create New Reservation</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time inventory validation & instant voucher generation</p>
          </div>
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Cancel
          </button>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
          {[
            { num: 1, label: 'Guest & Dates' },
            { num: 2, label: 'Select Room' },
            { num: 3, label: 'Summary & Pay' },
            { num: 4, label: 'Confirmed' }
          ].map(s => (
            <div
              key={s.num}
              className={`flex items-center space-x-2 p-2 rounded-xl border transition ${
                step === s.num
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                  : step > s.num
                  ? 'bg-slate-800 text-emerald-400 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step === s.num
                    ? 'bg-emerald-500 text-slate-950'
                    : step > s.num
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s.num ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: GUEST DETAILS & STAY DATES */}
      {step === 1 && (
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <User className="w-4 h-4" /> Guest Information
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={guestMobile}
                    onChange={e => setGuestMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Source</label>
                <select
                  value={bookingSource}
                  onChange={e => setBookingSource(e.target.value as BookingSource)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Direct">Direct Booking</option>
                  <option value="WhatsApp">WhatsApp Inquiry</option>
                  <option value="Phone">Phone Call</option>
                  <option value="Walk-in">Walk-in Reservation</option>
                </select>
              </div>
            </div>

            {/* Stay Dates & Capacity */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Stay Schedule & Guests
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={e => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out Date *</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Guests</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={numberOfGuests}
                    placeholder="0"
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setNumberOfGuests('');
                      } else {
                        const parsed = parseInt(raw, 10);
                        setNumberOfGuests(isNaN(parsed) ? '' : Math.max(0, parsed));
                      }
                    }}
                    onBlur={() => {
                      if (numberOfGuests === '') {
                        setNumberOfGuests(0);
                      }
                    }}
                    className="w-24 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-500">
                    Calculated Stay Duration: <strong className="text-emerald-700">{nights} Night(s)</strong>
                  </span>
                </div>
              </div>

              {/* Extra Bed Option */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-amber-600" />
                    <span>Extra Bed Option</span>
                  </label>
                  {extraBedCount > 0 && (
                    <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                      + {formatCurrency(extraBedTotal)} Total ({extraBedCount} bed(s) × {nights} nights)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Extra Beds Required</label>
                    <select
                      value={extraBedCount}
                      onChange={e => setExtraBedCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value={0}>0 (No Extra Bed)</option>
                      <option value={1}>1 Extra Bed</option>
                      <option value={2}>2 Extra Beds</option>
                      <option value={3}>3 Extra Beds</option>
                      <option value={4}>4 Extra Beds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rate per Bed / Night (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={extraBedRatePerNight || ''}
                      placeholder="500"
                      onChange={e => setExtraBedRatePerNight(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Requests / Notes</label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Early check-in requested, extra bed, vegetarian breakfast..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleNextToStep2}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer"
            >
              <span>Search Available Rooms</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT AVAILABLE ROOM */}
      {step === 2 && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-600">
              <span>Searching rooms for: </span>
              <strong className="text-slate-800">{guestName} ({numberOfGuests === '' ? 0 : numberOfGuests} Guests)</strong>
              <span className="mx-2">|</span>
              <span className="text-emerald-700 font-semibold">
                {formatDateReadable(checkInDate)} → {formatDateReadable(checkOutDate)} ({nights} Nights)
              </span>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline"
            >
              Change Dates or Guests
            </button>
          </div>

          {searchResult.availableRooms.length === 0 ? (
            <div className="p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200 space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">No Direct Rooms Available for Selected Dates</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  All rooms matching capacity ({numberOfGuests} guests) are booked during {formatDateReadable(checkInDate)} to {formatDateReadable(checkOutDate)}.
                </p>
              </div>

              {/* AI Alternatives Suggestion Box */}
              {searchResult.suggestions.length > 0 && (
                <div className="space-y-3 pt-2 max-w-lg mx-auto text-left">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Recommended System Alternatives:
                  </h4>
                  {searchResult.suggestions.map((s, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-amber-900">{s.title}</span>
                      </div>
                      <p className="text-xs text-slate-600">{s.description}</p>
                      {s.recommendedCheckIn && s.recommendedCheckOut && (
                        <button
                          onClick={() => {
                            setCheckInDate(s.recommendedCheckIn!);
                            setCheckOutDate(s.recommendedCheckOut!);
                          }}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg transition"
                        >
                          Apply Alternate Dates ({s.recommendedCheckIn})
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {searchResult.availableRooms.length} Available Room(s) Found — Choose 1 or More Rooms
                </h3>
                {selectedRoomIds.length > 0 && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    {selectedRoomIds.length} Room(s) Selected ({totalCombinedCapacity} Guest Capacity)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResult.availableRooms.map(room => {
                  const roomTotal = room.pricePerNight * nights;
                  const isSelected = selectedRoomIds.includes(room.id);
                  const isRecommended = searchResult.recommendedRooms[0]?.id === room.id;

                  return (
                    <div
                      key={room.id}
                      onClick={() => toggleRoomSelection(room.id)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-4 relative cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                          : isRecommended
                          ? 'border-emerald-300 hover:border-emerald-500 bg-white shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        {isRecommended && !isSelected ? (
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300" /> Best Capacity Match
                          </span>
                        ) : <div />}

                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                          isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>+ Select Room</span>
                          )}
                        </div>
                      </div>

                      {room.imageUrl && (
                        <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={room.imageUrl}
                            alt={room.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-base font-bold text-slate-800">{room.name}</h4>
                            <p className="text-xs text-slate-500">Room #{room.roomNumber} • {room.type}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-slate-900">{formatCurrency(room.pricePerNight)}</span>
                            <span className="text-[10px] text-slate-500 block">/ night</span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                            Capacity: {room.capacity} Guests
                          </span>
                          {room.amenities.slice(0, 3).map((a, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Rate for {nights} Nights:</span>
                          <span className="text-sm font-bold text-emerald-700">{formatCurrency(roomTotal)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRoomSelection(room.id);
                          }}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                            isSelected
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isSelected ? 'Deselect Room' : 'Add to Booking'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              disabled={selectedRoomIds.length === 0}
              onClick={handleNextToStep3}
              className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer ${
                selectedRoomIds.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Continue with {selectedRoomIds.length} Selected Room(s)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SUMMARY & CONFIRMATION */}
      {step === 3 && selectedRooms.length > 0 && (
        <div className="p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-emerald-700">
            Booking Summary & Pricing Verification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking Details Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stay & Guest Details</h4>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Guest Name:</span>
                  <strong className="text-slate-900">{guestName}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Mobile:</span>
                  <span>{guestMobile}</span>
                </div>
                <div className="border-b border-slate-200 pb-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Room(s):</span>
                    <span className="font-bold text-emerald-800">{selectedRooms.length} Room(s)</span>
                  </div>
                  <ul className="space-y-1 mt-1 pl-2 border-l-2 border-emerald-500">
                    {selectedRooms.map(r => (
                      <li key={r.id} className="flex justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">{r.name} (Room #{r.roomNumber})</span>
                        <span className="text-slate-500">{formatCurrency(r.pricePerNight)}/night</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Dates:</span>
                  <span>{formatDateReadable(checkInDate)} → {formatDateReadable(checkOutDate)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Total Stay:</span>
                  <strong>{nights} Night(s)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Channel:</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[10px]">{bookingSource}</span>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Payment & Rate Calculation</h4>
                {removeGst && (
                  <span className="px-2 py-0.5 bg-emerald-700 text-white font-bold text-[10px] rounded-full">
                    GST Removed (0%)
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Room Base Rate ({formatCurrency(combinedRatePerNight)} × {nights} Nights):</span>
                  <span className="font-medium text-slate-900">{formatCurrency(roomSubtotal)}</span>
                </div>

                {extraBedCount > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-amber-600" />
                      Extra Bed ({extraBedCount} Bed(s) × {formatCurrency(extraBedRatePerNight)}/night × {nights}N):
                    </span>
                    <span>+{formatCurrency(extraBedTotal)}</span>
                  </div>
                )}

                {kitchenAndGasCharges > 0 && (
                  <div className="flex justify-between text-orange-900 font-semibold bg-orange-50/80 px-2 py-1 rounded-lg border border-orange-200/60">
                    <span className="flex items-center gap-1">
                      <span>🔥</span>
                      Kitchen & Gas Charges ({kitchenAndGasNotes || 'Equipment Rental'}):
                    </span>
                    <span>+{formatCurrency(kitchenAndGasCharges)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-emerald-100">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Applied:</span>
                    <span>-{formatCurrency(effectiveDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>GST / Taxes ({removeGst ? '0% - Waived' : '5%'}):</span>
                  <span className={removeGst ? 'line-through text-slate-400' : ''}>
                    {removeGst ? formatCurrency(standardGst) : formatCurrency(taxAmount)}
                  </span>
                </div>

                <div className="pt-2 border-t border-emerald-200/80 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Total Amount Due:</span>
                  <span className="text-emerald-700">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* KITCHEN & GAS EQUIPMENT CHARGES */}
              <div className="p-3 bg-white rounded-xl border border-orange-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>Kitchen & Gas Equipment Rental (Optional)</span>
                  </label>
                  {kitchenAndGasCharges > 0 && (
                    <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full">
                      +{formatCurrency(kitchenAndGasCharges)} Added
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Equipment Charge (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={kitchenAndGasCharges || ''}
                      onChange={e => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setKitchenAndGasCharges(val);
                        const nextSub = roomSubtotal + extraBedTotal + val;
                        const nextEff = Math.min(nextSub, discountAmount);
                        const nextTax = removeGst ? 0 : Math.round(Math.max(0, nextSub - nextEff) * 0.05);
                        setAdvanceAmount(Math.max(0, nextSub - nextEff + nextTax));
                      }}
                      placeholder="e.g. 300 / day"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Equipment Description</label>
                    <input
                      type="text"
                      value={kitchenAndGasNotes}
                      onChange={e => setKitchenAndGasNotes(e.target.value)}
                      placeholder="e.g. LPG Cylinder + Cookware"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets Buttons */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 mr-1">Quick Presets:</span>
                  {[
                    { label: 'LPG Gas (₹300/day)', val: 300 * nights, desc: 'LPG Gas Cylinder & Stove' },
                    { label: 'Full Kitchen Set (₹500/day)', val: 500 * nights, desc: 'LPG Gas + Utensils & Cookware' },
                    { label: 'BBQ Grill Set (₹500)', val: 500, desc: 'BBQ Grill & Charcoal Kit' },
                    { label: 'Induction Cooktop (₹250/day)', val: 250 * nights, desc: 'Induction Cooktop & Steel Pots' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setKitchenAndGasCharges(p.val);
                        setKitchenAndGasNotes(p.desc);
                        const nextSub = roomSubtotal + extraBedTotal + p.val;
                        const nextEff = Math.min(nextSub, discountAmount);
                        const nextTax = removeGst ? 0 : Math.round(Math.max(0, nextSub - nextEff) * 0.05);
                        setAdvanceAmount(Math.max(0, nextSub - nextEff + nextTax));
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-md transition cursor-pointer"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DISCOUNT & GST REMOVAL CONTROLS */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Discount & GST Options</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextRemoveState = !removeGst;
                      setRemoveGst(nextRemoveState);
                      const nextTax = nextRemoveState ? 0 : Math.round(Math.max(0, subtotal - effectiveDiscount) * 0.05);
                      const nextTot = Math.max(0, subtotal - effectiveDiscount + nextTax);
                      setAdvanceAmount(nextTot);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                      removeGst
                        ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {removeGst ? '✓ GST Removed (Click to Restore)' : '⚡ Remove GST (0% Tax)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      max={subtotal}
                      value={discountAmount || ''}
                      onChange={e => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setDiscountAmount(val);
                        const nextEff = Math.min(subtotal, val);
                        const nextTax = removeGst ? 0 : Math.round(Math.max(0, subtotal - nextEff) * 0.05);
                        const nextTot = Math.max(0, subtotal - nextEff + nextTax);
                        setAdvanceAmount(nextTot);
                      }}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveGst(true);
                        const nextTot = Math.max(0, subtotal - effectiveDiscount);
                        setAdvanceAmount(nextTot);
                      }}
                      className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg transition text-center ${
                        removeGst ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {removeGst ? 'GST Removed' : 'Remove GST'}
                    </button>

                    {(discountAmount > 0 || removeGst) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountAmount(0);
                          setRemoveGst(false);
                          const defaultTax = Math.round(subtotal * 0.05);
                          setAdvanceAmount(subtotal + defaultTax);
                        }}
                        className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition shrink-0"
                      >
                        Reset All
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Amount Paid (₹)</label>
                <div className="relative mb-1.5">
                  <input
                    type="number"
                    min={0}
                    max={totalAmount}
                    value={advanceAmount === 0 ? '' : advanceAmount}
                    placeholder="0"
                    onChange={e => {
                      const raw = e.target.value;
                      const val = raw === '' ? 0 : Math.max(0, parseInt(raw) || 0);
                      setAdvanceAmount(val);
                      if (val >= totalAmount) setPaymentStatus('Paid');
                      else if (val > 0) setPaymentStatus('Partial');
                      else setPaymentStatus('Pending');
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => { setAdvanceAmount(totalAmount); setPaymentStatus('Paid'); }}
                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md transition"
                  >
                    Full (₹{totalAmount})
                  </button>
                  <button
                    type="button"
                    onClick={() => { const half = Math.round(totalAmount / 2); setAdvanceAmount(half); setPaymentStatus('Partial'); }}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-md transition"
                  >
                    50% Advance (₹{Math.round(totalAmount / 2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAdvanceAmount(0); setPaymentStatus('Pending'); }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md transition"
                  >
                    Zero (₹0)
                  </button>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
                  <span className="text-slate-600">Remaining Balance Due at Check-In:</span>
                  <strong className={`font-extrabold ${totalAmount - advanceAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {formatCurrency(Math.max(0, totalAmount - advanceAmount))}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={e => {
                    const st = e.target.value as PaymentStatus;
                    setPaymentStatus(st);
                    if (st === 'Paid') setAdvanceAmount(totalAmount);
                    else if (st === 'Pending') setAdvanceAmount(0);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                >
                  <option value="Paid">Fully Paid (₹{totalAmount})</option>
                  <option value="Partial">Partial Advance Received</option>
                  <option value="Pending">Payment Pending upon Arrival</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Rooms
            </button>

            <button
              onClick={handleConfirmBooking}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Confirm & Issue Booking</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS CONFIRMATION VOUCHER */}
      {step === 4 && selectedRooms.length > 0 && (
        <div className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-slate-800">Reservation Confirmed!</h3>
            <p className="text-xs text-slate-500 mt-1">Inventory locked for {selectedRooms.length} room(s) and calendar updated automatically.</p>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 max-w-lg mx-auto text-left space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Guest</span>
                <p className="text-sm font-bold text-slate-800">{guestName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Booked Rooms ({selectedRooms.length})</span>
                <p className="text-xs font-bold text-emerald-700">{selectedRooms.map(r => r.name).join(', ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Check-In</span>
                <strong className="text-slate-800">{formatDateReadable(checkInDate)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Check-Out</span>
                <strong className="text-slate-800">{formatDateReadable(checkOutDate)}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
              {extraBedCount > 0 && (
                <div className="flex justify-between items-center text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                  <span>Extra Bed ({extraBedCount} Bed(s)):</span>
                  <span>+{formatCurrency(extraBedTotal)}</span>
                </div>
              )}
              {effectiveDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(effectiveDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-500">
                <span>GST Tax Status:</span>
                <span className={removeGst ? 'font-bold text-emerald-700' : ''}>
                  {removeGst ? 'Waived / Removed (0%)' : `Standard 5% (${formatCurrency(taxAmount)})`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Booking Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span>Advance Paid:</span>
                <span className="font-bold">{formatCurrency(advanceAmount)}</span>
              </div>
              <div className="flex justify-between items-center font-extrabold text-sm pt-1 border-t border-slate-200">
                <span>Balance Due at Check-in:</span>
                <span className={totalAmount - advanceAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {formatCurrency(Math.max(0, totalAmount - advanceAmount))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3">
            <button
              onClick={() => {
                const roomNames = selectedRooms.map(r => r.name).join(', ');
                const shareText = generateBookingShareText({
                  bookingNumber: createdBookingInfo?.bookingNumber || 'HS-2026',
                  confirmationCode: createdBookingInfo?.confirmationCode || 'CNF-PENDING',
                  guestName,
                  guestMobile,
                  roomNames,
                  checkInDate,
                  checkOutDate,
                  nights,
                  totalAmount,
                  advanceAmount,
                  paymentStatus: advanceAmount >= totalAmount ? 'Paid' : (advanceAmount > 0 ? 'Partial' : 'Pending'),
                  discountAmount: effectiveDiscount,
                  isGstExempt: removeGst,
                  extraBedCount,
                  extraBedRatePerNight,
                  extraBedAmount: extraBedTotal
                });
                window.open(getWhatsAppShareUrl(guestMobile, shareText), '_blank');
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition"
            >
              <MessageSquare className="w-4 h-4" /> Share on WhatsApp
            </button>

            <button
              onClick={() => {
                const roomNames = selectedRooms.map(r => r.name).join(', ');
                const shareText = generateBookingShareText({
                  bookingNumber: createdBookingInfo?.bookingNumber || 'HS-2026',
                  confirmationCode: createdBookingInfo?.confirmationCode || 'CNF-PENDING',
                  guestName,
                  guestMobile,
                  roomNames,
                  checkInDate,
                  checkOutDate,
                  nights,
                  totalAmount,
                  advanceAmount,
                  paymentStatus: advanceAmount >= totalAmount ? 'Paid' : (advanceAmount > 0 ? 'Partial' : 'Pending'),
                  discountAmount: effectiveDiscount,
                  isGstExempt: removeGst,
                  extraBedCount,
                  extraBedRatePerNight,
                  extraBedAmount: extraBedTotal
                });

                if (navigator.share) {
                  navigator.share({
                    title: `Nohshring Homestay Booking Voucher`,
                    text: shareText
                  }).catch(() => {
                    navigator.clipboard.writeText(shareText);
                    setCopiedInWizard(true);
                    setTimeout(() => setCopiedInWizard(false), 3000);
                  });
                } else {
                  navigator.clipboard.writeText(shareText);
                  setCopiedInWizard(true);
                  setTimeout(() => setCopiedInWizard(false), 3000);
                }
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
            >
              {copiedInWizard ? (
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
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
            >
              <Printer className="w-4 h-4" /> Print Voucher
            </button>

            <button
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition"
            >
              Done & View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
