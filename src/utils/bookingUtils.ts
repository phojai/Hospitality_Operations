import {
  Room,
  Booking,
  AvailabilitySearchResult,
  AlternativeSuggestion,
  CalendarDayState,
  OccupancyStats,
  RevenueStats,
  CalendarCellType
} from '../types';

export function getTodayIST(): string {
  // Indian Standard Time (Asia/Kolkata, UTC+5:30)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export function getOffsetISTDate(daysOffset: number): string {
  const todayStr = getTodayIST();
  const d = parseYMD(todayStr);
  d.setDate(d.getDate() + daysOffset);
  return formatYMD(d);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function parseYMD(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseYMD(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const d1 = parseYMD(checkIn);
  const d2 = parseYMD(checkOut);
  const diffTime = d2.getTime() - d1.getTime();
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
}

export function checkDateOverlap(
  checkIn1: string,
  checkOut1: string,
  checkIn2: string,
  checkOut2: string
): boolean {
  // Check-in on same day as previous check-out is NOT an overlap
  // Overlap condition: start1 < end2 AND end1 > start2
  const s1 = parseYMD(checkIn1).getTime();
  const e1 = parseYMD(checkOut1).getTime();
  const s2 = parseYMD(checkIn2).getTime();
  const e2 = parseYMD(checkOut2).getTime();

  return s1 < e2 && e1 > s2;
}

export function getBookingRoomNames(booking: Booking, rooms: Room[] = []): string {
  const safeRooms = rooms || [];
  const ids = booking.roomIds && booking.roomIds.length > 0 ? booking.roomIds : [booking.roomId];
  const matchedNames = ids.map(id => {
    const r = safeRooms.find(room => room.id === id);
    return r ? r.name : id;
  });
  if (matchedNames.length === 1) return matchedNames[0];
  return `${matchedNames.join(', ')} (${matchedNames.length} Rooms)`;
}

export function isRoomAvailableForDates(
  roomId: string,
  checkIn: string,
  checkOut: string,
  bookings: Booking[] = [],
  excludeBookingId?: string
): boolean {
  const activeBookings = (bookings || []).filter(
    b => (b.roomId === roomId || (b.roomIds && b.roomIds.includes(roomId))) &&
         b.status !== 'cancelled' &&
         b.id !== excludeBookingId
  );

  for (const b of activeBookings) {
    if (checkDateOverlap(checkIn, checkOut, b.checkInDate, b.checkOutDate)) {
      return false;
    }
  }
  return true;
}

export function searchAvailability(
  rooms: Room[] = [],
  bookings: Booking[] = [],
  checkIn: string,
  checkOut: string,
  guests: number,
  roomTypeFilter?: string
): AvailabilitySearchResult {
  const nights = calculateNights(checkIn, checkOut);
  
  // Filter active rooms first
  let eligibleRooms = (rooms || []).filter(r => r.status === 'active');

  if (roomTypeFilter && roomTypeFilter !== 'All') {
    eligibleRooms = eligibleRooms.filter(r => r.type === roomTypeFilter);
  }

  // Find all active rooms available for these dates
  const availableRooms = eligibleRooms.filter(r =>
    isRoomAvailableForDates(r.id, checkIn, checkOut, bookings)
  );

  // Filter capacity matched for recommendation
  const capacityMatched = availableRooms.filter(r => r.capacity >= guests);

  const recommendedRooms = [...(capacityMatched.length > 0 ? capacityMatched : availableRooms)].sort((a, b) => {
    const wasteA = Math.abs(a.capacity - guests);
    const wasteB = Math.abs(b.capacity - guests);
    return wasteA - wasteB || a.pricePerNight - b.pricePerNight;
  });

  const unavailableCount = eligibleRooms.length - availableRooms.length;

  // Generate smart suggestions if no rooms available at all
  const suggestions: AlternativeSuggestion[] = [];

  if (availableRooms.length === 0) {
    const originalCheckInDate = parseYMD(checkIn);
    const altCheckInDate1 = new Date(originalCheckInDate);
    altCheckInDate1.setDate(altCheckInDate1.getDate() + 2);
    const altCheckOutDate1 = new Date(altCheckInDate1);
    altCheckOutDate1.setDate(altCheckOutDate1.getDate() + nights);

    const altCheckInStr1 = formatYMD(altCheckInDate1);
    const altCheckOutStr1 = formatYMD(altCheckOutDate1);

    const altAvailable1 = eligibleRooms.filter(r =>
      isRoomAvailableForDates(r.id, altCheckInStr1, altCheckOutStr1, bookings)
    );

    if (altAvailable1.length > 0) {
      suggestions.push({
        type: 'alternate_dates',
        title: 'Alternate Shifted Dates (+2 Days)',
        description: `${altAvailable1.length} room(s) available from ${formatDateReadable(altCheckInStr1)} to ${formatDateReadable(altCheckOutStr1)}.`,
        recommendedCheckIn: altCheckInStr1,
        recommendedCheckOut: altCheckOutStr1,
        recommendedRoomIds: altAvailable1.map(r => r.id)
      });
    }
  }

  return {
    availableRooms,
    recommendedRooms,
    unavailableCount,
    suggestions,
    totalNights: nights
  };
}

export function generateCalendarMatrix(
  rooms: Room[] = [],
  bookings: Booking[] = [],
  startDateStr: string,
  numDays: number = 14
): {
  dates: string[];
  matrix: { room: Room; days: CalendarDayState[] }[];
} {
  const dates: string[] = [];
  const start = parseYMD(startDateStr);

  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(formatYMD(d));
  }

  const activeOrDeactivatedRooms = (rooms || []).filter(r => r.status !== 'archived');

  const matrix = activeOrDeactivatedRooms.map(room => {
    const days: CalendarDayState[] = dates.map(dateStr => {
      if (room.status === 'deactivated') {
        return { dateStr, type: 'deactivated' };
      }

      // Find all bookings for this room on dateStr
      const dayTime = parseYMD(dateStr).getTime();

      const activeBookingsOnDate = (bookings || []).filter(b => {
        const isMatch = b.roomId === room.id || (b.roomIds && b.roomIds.includes(room.id));
        if (!isMatch || b.status === 'cancelled') return false;
        const bIn = parseYMD(b.checkInDate).getTime();
        const bOut = parseYMD(b.checkOutDate).getTime();

        return dayTime >= bIn && dayTime <= bOut;
      });

      if (activeBookingsOnDate.length === 0) {
        return { dateStr, type: 'available' };
      }

      // Check for check-out booking on dateStr
      const checkOutBooking = activeBookingsOnDate.find(b => b.checkOutDate === dateStr);

      // Check for check-in booking on dateStr
      const checkInBooking = activeBookingsOnDate.find(b => b.checkInDate === dateStr);

      // Check for stay booking (where dateStr is inside checkInDate < dateStr < checkOutDate)
      const stayBooking = activeBookingsOnDate.find(b => b.checkInDate < dateStr && dateStr < b.checkOutDate);

      if (stayBooking) {
        return {
          dateStr,
          type: 'booked',
          booking: stayBooking
        };
      }

      // If both checkOut and checkIn happen on dateStr from different bookings
      if (checkOutBooking && checkInBooking && checkOutBooking.id !== checkInBooking.id) {
        return {
          dateStr,
          type: 'same_day_turnover',
          checkOutBooking,
          checkInBooking,
          booking: checkInBooking
        };
      }

      if (checkOutBooking) {
        return {
          dateStr,
          type: 'check_out',
          checkOutBooking,
          booking: checkOutBooking
        };
      }

      if (checkInBooking) {
        return {
          dateStr,
          type: 'check_in',
          checkInBooking,
          booking: checkInBooking
        };
      }

      return {
        dateStr,
        type: 'booked',
        booking: activeBookingsOnDate[0]
      };
    });

    return { room, days };
  });

  return { dates, matrix };
}

export function calculateOccupancyStats(
  rooms: Room[] = [],
  bookings: Booking[] = [],
  targetDateStr: string
): OccupancyStats {
  const safeRooms = rooms || [];
  const safeBookings = bookings || [];
  const activeRooms = safeRooms.filter(r => r.status === 'active');
  const totalRooms = activeRooms.length;

  const targetTime = parseYMD(targetDateStr).getTime();

  let occupiedToday = 0;
  let todayCheckInsCount = 0;
  let todayCheckOutsCount = 0;

  activeRooms.forEach(room => {
    const isOccupied = safeBookings.some(b => {
      const isMatch = b.roomId === room.id || (b.roomIds && b.roomIds.includes(room.id));
      if (!isMatch || b.status === 'cancelled') return false;
      const bIn = parseYMD(b.checkInDate).getTime();
      const bOut = parseYMD(b.checkOutDate).getTime();
      // Occupied if checkIn <= targetTime < checkOut
      return targetTime >= bIn && targetTime < bOut;
    });

    if (isOccupied) occupiedToday++;
  });

  safeBookings.forEach(b => {
    if (b.status === 'cancelled') return;
    if (b.checkInDate === targetDateStr) todayCheckInsCount++;
    if (b.checkOutDate === targetDateStr) todayCheckOutsCount++;
  });

  const availableToday = Math.max(0, totalRooms - occupiedToday);
  const occupancyRatePercentage = totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

  // Upcoming in next 7 days
  const targetDateObj = parseYMD(targetDateStr);
  const end7DaysObj = new Date(targetDateObj);
  end7DaysObj.setDate(end7DaysObj.getDate() + 7);
  const end7Time = end7DaysObj.getTime();

  let upcomingArrivals7Days = 0;
  let upcomingDepartures7Days = 0;

  safeBookings.forEach(b => {
    if (b.status === 'cancelled') return;
    const bIn = parseYMD(b.checkInDate).getTime();
    const bOut = parseYMD(b.checkOutDate).getTime();

    if (bIn >= targetTime && bIn <= end7Time) upcomingArrivals7Days++;
    if (bOut >= targetTime && bOut <= end7Time) upcomingDepartures7Days++;
  });

  return {
    totalRooms,
    occupiedToday,
    availableToday,
    occupancyRatePercentage,
    todayCheckInsCount,
    todayCheckOutsCount,
    upcomingArrivals7Days,
    upcomingDepartures7Days
  };
}

export function calculateRevenueStats(
  rooms: Room[] = [],
  bookings: Booking[] = []
): RevenueStats {
  const safeRooms = rooms || [];
  const safeBookings = bookings || [];
  // Strictly filter out cancelled bookings from all revenue & stats calculations
  const activeBookings = safeBookings.filter(b => b.status !== 'cancelled');
  const activeRooms = safeRooms.filter(r => r.status === 'active');

  let dailyRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;

  let totalRoomNightsSold = 0;
  let totalRevenueAllTime = 0;

  const todayStr = getTodayIST();
  const today = parseYMD(todayStr);
  const todayTime = today.getTime();
  const sevenDaysAgo = todayTime - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = todayTime - 30 * 24 * 60 * 60 * 1000;
  const oneYearAgo = todayTime - 365 * 24 * 60 * 60 * 1000;

  activeBookings.forEach(b => {
    const amount = Number(b.totalAmount || 0);
    const nights = Number(b.nights || 1);

    totalRevenueAllTime += amount;
    totalRoomNightsSold += nights;

    if (b.checkInDate === todayStr || b.checkOutDate === todayStr) {
      dailyRevenue += amount / nights;
    }

    const checkInTime = parseYMD(b.checkInDate).getTime();
    if (checkInTime >= sevenDaysAgo && checkInTime <= todayTime + 86400000 * 30) {
      weeklyRevenue += amount;
    }
    if (checkInTime >= thirtyDaysAgo && checkInTime <= todayTime + 86400000 * 90) {
      monthlyRevenue += amount;
    }
    if (checkInTime >= oneYearAgo) {
      yearlyRevenue += amount;
    }
  });

  // Average Daily Rate = Total Active Revenue / Total Room Nights Sold
  const averageDailyRate = totalRoomNightsSold > 0 ? Math.round(totalRevenueAllTime / totalRoomNightsSold) : 0;

  // RevPAR = Total Active Revenue / Total Available Rooms
  const totalAvailableRooms = activeRooms.length || 1;
  const revenuePerAvailableRoom = Math.round(monthlyRevenue / (totalAvailableRooms * 30));

  return {
    dailyRevenue: Math.round(dailyRevenue),
    weeklyRevenue: Math.round(weeklyRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
    yearlyRevenue: Math.round(yearlyRevenue),
    averageDailyRate,
    revenuePerAvailableRoom,
    totalBookingsCount: activeBookings.length
  };
}

export function generateBookingIds(): { bookingNumber: string; confirmationCode: string } {
  const rand1 = Math.floor(1000 + Math.random() * 9000);
  const rand2 = Math.floor(1000 + Math.random() * 9000);
  return {
    bookingNumber: `HS-2026-${rand1}`,
    confirmationCode: `CNF-${rand2}`
  };
}

export interface ShareableBookingInfo {
  bookingNumber: string;
  confirmationCode: string;
  guestName: string;
  guestMobile: string;
  roomNames: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  advanceAmount: number;
  paymentStatus: string;
  discountAmount?: number;
  isGstExempt?: boolean;
  extraBedCount?: number;
  extraBedRatePerNight?: number;
  extraBedAmount?: number;
  foodAndBeverageCharges?: number;
  foodAndBeverageItemsSummary?: string;
  kitchenAndGasCharges?: number;
  kitchenAndGasItemsSummary?: string;
}

export function generateBookingShareText(info: ShareableBookingInfo): string {
  const due = Math.max(0, info.totalAmount - info.advanceAmount);
  const gstText = info.isGstExempt ? 'Waived / 0% Tax' : 'Included (5%)';
  const discountLine = info.discountAmount ? `\n🏷️ *Discount Applied:* -${formatCurrency(info.discountAmount)}` : '';
  const extraBedLine = (info.extraBedCount && info.extraBedCount > 0 && info.extraBedAmount)
    ? `\n🛏️ *Extra Bed:* ${info.extraBedCount} Bed(s) (${formatCurrency(info.extraBedRatePerNight || 0)}/night) = ${formatCurrency(info.extraBedAmount)}`
    : '';
  const fbLine = (info.foodAndBeverageCharges && info.foodAndBeverageCharges > 0)
    ? `\n🍽️ *Food & Beverages:* ${formatCurrency(info.foodAndBeverageCharges)}${info.foodAndBeverageItemsSummary ? ` (${info.foodAndBeverageItemsSummary})` : ''}`
    : '';
  const kgLine = (info.kitchenAndGasCharges && info.kitchenAndGasCharges > 0)
    ? `\n🔥 *Kitchen & Gas Equipment:* ${formatCurrency(info.kitchenAndGasCharges)}${info.kitchenAndGasItemsSummary ? ` (${info.kitchenAndGasItemsSummary})` : ''}`
    : '';

  return `🏡 *NOHSHRING HOMESTAY*
Official Stay Confirmation Voucher

--------------------------------
📋 *Booking Ref:* ${info.bookingNumber} (${info.confirmationCode})
👤 *Guest Name:* ${info.guestName}
📞 *Mobile:* ${info.guestMobile}
🚪 *Room(s):* ${info.roomNames}
📅 *Check-In:* ${formatDateReadable(info.checkInDate)} (From 2:00 PM)
📅 *Check-Out:* ${formatDateReadable(info.checkOutDate)} (By 11:00 AM)
🌙 *Stay Duration:* ${info.nights} Night(s)${extraBedLine}${fbLine}${kgLine}
--------------------------------
💰 *Total Amount:* ${formatCurrency(info.totalAmount)}${discountLine}
📋 *GST Status:* ${gstText}
💵 *Advance Paid:* ${formatCurrency(info.advanceAmount)}
💳 *Balance Due:* ${formatCurrency(due)} (${info.paymentStatus})
--------------------------------
📍 *Address:* Near Karbi Club, Umrangso, Dima Hasao, Assam
📞 *Contact:* +91 7086015740

We look forward to hosting you at Nohshring Homestay! 🌿`;
}

export function getWhatsAppShareUrl(phone: string, shareText: string): string {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(shareText);
  return targetPhone ? `https://wa.me/${targetPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

