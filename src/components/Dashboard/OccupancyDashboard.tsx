import React, { useState } from 'react';
import { Room, Booking, GuestProfile } from '../../types';
import {
  calculateOccupancyStats,
  formatDateReadable,
  formatCurrency,
  formatYMD,
  getTodayIST
} from '../../utils/bookingUtils';
import {
  Bed,
  CheckCircle2,
  LogOut,
  LogIn,
  Calendar,
  Users,
  Clock,
  ArrowUpRight,
  Sparkles,
  Phone,
  MessageSquare,
  Star
} from 'lucide-react';

interface OccupancyDashboardProps {
  rooms: Room[];
  bookings: Booking[];
  guests?: GuestProfile[];
  onCheckIn: (bookingId: string) => void;
  onCheckOut: (bookingId: string) => void;
  onNewBooking: () => void;
  onViewBookingDetails: (booking: Booking) => void;
}

export const OccupancyDashboard: React.FC<OccupancyDashboardProps> = ({
  rooms = [],
  bookings = [],
  guests = [],
  onCheckIn,
  onCheckOut,
  onNewBooking,
  onViewBookingDetails
}) => {
  const [targetDateStr, setTargetDateStr] = useState<string>(getTodayIST());

  const stats = calculateOccupancyStats(rooms, bookings, targetDateStr);

  const isVipBooking = (booking: Booking): boolean => {
    if (!guests || guests.length === 0) return false;
    const bMob = (booking.guestMobile || '').replace(/\D/g, '');
    const bName = (booking.guestName || '').trim().toLowerCase();
    return guests.some(g => {
      if (!g.isVIP) return false;
      const gMob = (g.mobile || '').replace(/\D/g, '');
      if (bMob && gMob && bMob === gMob) return true;
      if (bName && g.name && bName === g.name.trim().toLowerCase()) return true;
      return false;
    });
  };

  const todayBookings = bookings.filter(
    b => b.status !== 'cancelled' &&
         (b.checkInDate === targetDateStr || b.checkOutDate === targetDateStr)
  );

  const todayCheckIns = bookings.filter(
    b => b.status !== 'cancelled' && b.checkInDate === targetDateStr
  );

  const todayCheckOuts = bookings.filter(
    b => b.status !== 'cancelled' && b.checkOutDate === targetDateStr
  );

  const currentlyInHouse = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    return b.status === 'checked_in';
  });

  return (
    <div className="space-y-6">
      {/* Date Header Control */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Occupancy Overview</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
              {formatDateReadable(targetDateStr)}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time room occupancy, check-in schedules, and room availability</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
            <input
              type="date"
              value={targetDateStr}
              onChange={e => setTargetDateStr(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer pr-1"
            />
          </div>
          <button
            onClick={() => setTargetDateStr(getTodayIST())}
            className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition cursor-pointer"
          >
            Today (IST)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Rate Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Occupancy Rate</p>
              <h3 className="text-3xl font-extrabold mt-1">{stats.occupancyRatePercentage}%</h3>
              <p className="text-xs text-emerald-100 mt-1">
                {stats.occupiedToday} of {stats.totalRooms} Rooms Occupied
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Bed className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 w-full bg-emerald-900/40 h-2 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500"
              style={{ width: `${stats.occupancyRatePercentage}%` }}
            />
          </div>
        </div>

        {/* Available Rooms Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available Rooms</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats.availableToday}</h3>
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Walk-ins
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Bed className="w-6 h-6" />
            </div>
          </div>
          <button
            onClick={onNewBooking}
            className="mt-3 text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            Book an Available Room <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Today's Check-Ins */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Check-Ins</p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1">{stats.todayCheckInsCount}</h3>
              <p className="text-xs text-slate-500 mt-1">Arrivals expected today</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <LogIn className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Next 7 Days: <span className="font-semibold text-slate-700">{stats.upcomingArrivals7Days} arrivals</span></p>
        </div>

        {/* Today's Check-Outs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Check-Outs</p>
              <h3 className="text-3xl font-extrabold text-blue-600 mt-1">{stats.todayCheckOutsCount}</h3>
              <p className="text-xs text-slate-500 mt-1">Departures scheduled today</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <LogOut className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Next 7 Days: <span className="font-semibold text-slate-700">{stats.upcomingDepartures7Days} departures</span></p>
        </div>
      </div>

      {/* Main Operations Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Check-in / Check-out Execution Queue (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>Today's Guest Schedule & Actions</span>
              </h3>
              <p className="text-xs text-slate-500">Quickly complete check-ins and check-outs for guests arriving or departing on {formatDateReadable(targetDateStr)}</p>
            </div>
          </div>

          {todayBookings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No check-ins or check-outs scheduled for this date.</p>
              <button
                onClick={onNewBooking}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Create a new walk-in or advance booking
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map(booking => {
                const room = rooms.find(r => r.id === booking.roomId);
                const isCheckInToday = booking.checkInDate === targetDateStr;
                const isCheckOutToday = booking.checkOutDate === targetDateStr;
                const isVIP = isVipBooking(booking);

                return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isVIP
                        ? 'border-2 border-amber-400 bg-amber-50/70 shadow-xs'
                        : 'border border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{booking.guestName}</span>
                        {isVIP && (
                          <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 font-black text-[10px] rounded-full flex items-center gap-1 shadow-xs border border-amber-500/30">
                            <Star className="w-3 h-3 fill-amber-950 text-amber-950" /> VIP GUEST
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                          {room?.name || 'Room'} ({room?.roomNumber})
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
                          {booking.bookingNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {booking.numberOfGuests} Guests
                        </span>
                        <span>
                          Stay: {formatDateReadable(booking.checkInDate)} → {formatDateReadable(booking.checkOutDate)} ({booking.nights} Nights)
                        </span>
                        <span className="font-semibold text-slate-700">
                          Total: {formatCurrency(booking.totalAmount)}
                        </span>
                      </div>

                      {booking.specialRequests && (
                        <p className="text-xs text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 mt-1">
                          <strong>Note:</strong> {booking.specialRequests}
                        </p>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => onViewBookingDetails(booking)}
                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition"
                      >
                        Details
                      </button>

                      {isCheckInToday && booking.status === 'confirmed' && (
                        <button
                          onClick={() => onCheckIn(booking.id)}
                          className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 transition cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5" /> Check In
                        </button>
                      )}

                      {isCheckOutToday && booking.status === 'checked_in' && (
                        <button
                          onClick={() => onCheckOut(booking.id)}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1 transition cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Check Out
                        </button>
                      )}

                      {booking.status === 'checked_in' && !isCheckOutToday && (
                        <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
                          In House
                        </span>
                      )}

                      {booking.status === 'checked_out' && (
                        <span className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Currently In-House Guests Directory (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Currently In House ({currentlyInHouse.length})</span>
            </h3>
          </div>

          {currentlyInHouse.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No checked-in guests in house right now.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {currentlyInHouse.map(booking => {
                const room = rooms.find(r => r.id === booking.roomId);
                const isVIP = isVipBooking(booking);
                const whatsappUrl = `https://wa.me/${booking.guestMobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${booking.guestName}, greetings from Valley View Homestay! Hope your stay in ${room?.name || 'your room'} is comfortable. Let us know if you need anything!`)}`;

                return (
                  <div
                    key={booking.id}
                    className={`p-3 rounded-xl space-y-2 transition ${
                      isVIP
                        ? 'bg-amber-50/90 border-2 border-amber-300'
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-800">{booking.guestName}</h4>
                          {isVIP && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-400 text-amber-950 font-black rounded-full flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-950" /> VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-700 font-semibold">{room?.name} (Room {room?.roomNumber})</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full shrink-0">
                        Checked In
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>Checkout: <span className="font-semibold text-slate-700">{formatDateReadable(booking.checkOutDate)}</span></p>
                      <p className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" /> {booking.guestMobile}
                      </p>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg flex items-center gap-1 transition"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                      <button
                        onClick={() => onViewBookingDetails(booking)}
                        className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition"
                      >
                        View Voucher
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
