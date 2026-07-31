import React, { useState } from 'react';
import { Room, Booking, RoomType } from '../../types';
import {
  generateCalendarMatrix,
  formatDateReadable,
  formatYMD,
  parseYMD,
  formatCurrency,
  getTodayIST
} from '../../utils/bookingUtils';
import {
  Calendar as CalendarIcon,
  Filter,
  Search,
  Plus,
  Info,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  User,
  Sparkles
} from 'lucide-react';

interface CalendarViewProps {
  rooms: Room[];
  bookings: Booking[];
  onSelectCellBooking: (room: Room, dateStr: string) => void;
  onViewBookingDetails: (booking: Booking) => void;
  onLoadSampleData?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  rooms = [],
  bookings = [],
  onSelectCellBooking,
  onViewBookingDetails,
  onLoadSampleData
}) => {
  const [startDateStr, setStartDateStr] = useState<string>(getTodayIST());
  const [numDays, setNumDays] = useState<number>(14);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter rooms
  const filteredRooms = rooms.filter(r => {
    if (r.status === 'archived') return false;
    if (selectedRoomType !== 'All' && r.type !== selectedRoomType) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.roomNumber.toLowerCase().includes(q);
    }
    return true;
  });

  const { dates, matrix } = generateCalendarMatrix(
    filteredRooms,
    bookings,
    startDateStr,
    numDays
  );

  const roomTypes: string[] = [
    'All',
    'Cottage',
    'Deluxe Suite',
    'Garden Villa',
    'Standard Room',
    'Family Suite'
  ];

  const handleShiftDate = (days: number) => {
    const current = parseYMD(startDateStr);
    current.setDate(current.getDate() + days);
    setStartDateStr(formatYMD(current));
  };

  return (
    <div className="space-y-5">
      {/* Control Header */}
      <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span>Room Availability Calendar</span>
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              Dynamic visual grid showing real-time room availability, check-ins, and check-outs
            </p>
          </div>

          {/* Date Navigation & Range Selector */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-semibold text-slate-700">
              <button
                onClick={() => handleShiftDate(-7)}
                className="p-1.5 hover:bg-white rounded-lg transition"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">{formatDateReadable(startDateStr)}</span>
              <button
                onClick={() => handleShiftDate(7)}
                className="p-1.5 hover:bg-white rounded-lg transition"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setNumDays(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    numDays === d
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>

            <button
              onClick={() => setStartDateStr(getTodayIST())}
              className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Reset Today (IST)
            </button>

            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="text-xs px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Populate dynamic bookings across the calendar grid"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Spread Sample Calendar Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Room Type:</span>
            </div>
            {roomTypes.map(type => (
              <button
                key={type}
                onClick={() => setSelectedRoomType(type)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition cursor-pointer ${
                  selectedRoomType === type
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room name or #"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Legend - hidden on mobile to maximize vertical screen space */}
        <div className="hidden sm:flex flex-wrap items-center gap-4 text-xs font-medium pt-2 border-t border-slate-100">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 inline-block" />
            <span className="text-slate-700">🟢 Available (Click to book)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-500 border border-rose-600 inline-block" />
            <span className="text-slate-700">🔴 Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-500 inline-block" />
            <span className="text-slate-700">🟡 Check-In Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-sky-500 border border-sky-600 inline-block" />
            <span className="text-slate-700">🔵 Check-Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-slate-300 flex flex-col overflow-hidden text-[6px] font-black leading-none">
              <div className="bg-sky-500 text-white h-2 flex items-center justify-center">OUT</div>
              <div className="bg-amber-400 text-slate-950 h-2 flex items-center justify-center">IN</div>
            </div>
            <span className="text-slate-700 font-semibold">🔄 Same-Day Turnover (Split Box)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-300 border border-slate-400 inline-block" />
            <span className="text-slate-500">⚪ Deactivated</span>
          </div>
        </div>
      </div>

      {/* Calendar Matrix Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                {/* Sticky Left Header */}
                <th className="p-3.5 sticky left-0 z-20 bg-slate-900 min-w-[200px] border-r border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Room</span>
                    <span className="text-[10px] text-slate-400 font-normal">Capacity / Rate</span>
                  </div>
                </th>

                {/* Date Columns */}
                {dates.map(dateStr => {
                  const d = parseYMD(dateStr);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                  const isToday = dateStr === getTodayIST();

                  return (
                    <th
                      key={dateStr}
                      className={`p-2 text-center min-w-[85px] max-w-[95px] border-r border-slate-800 ${
                        isToday ? 'bg-emerald-800/90 text-white font-extrabold' : 'bg-slate-900 text-slate-200'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-400">{dayName}</div>
                      <div className="text-sm font-bold">{dayNum} {monthName}</div>
                      {isToday && (
                        <div className="text-[9px] bg-emerald-400 text-slate-950 font-black rounded uppercase px-1 mt-0.5 inline-block">
                          Today
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {matrix.map(({ room, days }) => (
                <tr key={room.id} className="hover:bg-slate-50/80 transition">
                  {/* Sticky Room Label */}
                  <td className="p-3 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-sm min-w-[200px]">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">{room.name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[11px]">
                          #{room.roomNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" /> Max {room.capacity}
                        </span>
                        <span className="font-semibold text-emerald-700">
                          {formatCurrency(room.pricePerNight)}/nt
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Day Cells */}
                  {days.map(dayState => {
                    const { dateStr, type, booking, checkOutBooking, checkInBooking } = dayState;

                    if (type === 'deactivated') {
                      return (
                        <td key={dateStr} className="p-1 border-r border-slate-200 bg-slate-100 text-slate-400 text-center">
                          <div className="w-full h-[60px] flex items-center justify-center">
                            <span className="text-[10px] font-medium text-slate-400">Offline</span>
                          </div>
                        </td>
                      );
                    }

                    if (type === 'available') {
                      return (
                        <td key={dateStr} className="p-1 border-r border-slate-200 text-center">
                          <button
                            onClick={() => onSelectCellBooking(room, dateStr)}
                            className="w-full h-[60px] rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/60 text-emerald-700 transition flex flex-col items-center justify-center group cursor-pointer"
                            title={`Click to book ${room.name} on ${formatDateReadable(dateStr)}`}
                          >
                            <Plus className="w-4 h-4 text-emerald-600 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition" />
                            <span className="text-[9px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                              Book
                            </span>
                          </button>
                        </td>
                      );
                    }

                    // Same-Day Turnover (Check-Out and Check-In on same day) -> Split into two rows
                    if (type === 'same_day_turnover') {
                      const outB = checkOutBooking || booking;
                      const inB = checkInBooking || booking;

                      return (
                        <td key={dateStr} className="p-1 border-r border-slate-200 text-center">
                          <div className="w-full h-[60px] flex flex-col justify-between gap-1">
                            {/* Top Row: Check-Out */}
                            <button
                              type="button"
                              onClick={() => outB && onViewBookingDetails(outB)}
                              className="w-full h-[27px] rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold px-1.5 py-0.5 text-left flex items-center justify-between text-[10px] overflow-hidden cursor-pointer shadow-2xs transition"
                              title={`Check-Out: ${outB?.guestName} (${outB?.nights}N)`}
                            >
                              <span className="text-[8px] uppercase font-black bg-sky-700/80 px-1 py-0.2 rounded text-sky-100 shrink-0">OUT</span>
                              <span className="truncate font-bold ml-1 text-right">{outB?.guestName}</span>
                            </button>

                            {/* Bottom Row: Check-In */}
                            <button
                              type="button"
                              onClick={() => inB && onViewBookingDetails(inB)}
                              className="w-full h-[27px] rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 text-left flex items-center justify-between text-[10px] overflow-hidden cursor-pointer shadow-2xs transition"
                              title={`Check-In: ${inB?.guestName} (${inB?.nights}N)`}
                            >
                              <span className="text-[8px] uppercase font-black bg-amber-600/30 px-1 py-0.2 rounded text-amber-950 shrink-0">IN</span>
                              <span className="truncate font-bold ml-1 text-right">{inB?.guestName}</span>
                            </button>
                          </div>
                        </td>
                      );
                    }

                    // Check-Out Day (Check-Out in morning + Option to book new guest in afternoon)
                    if (type === 'check_out') {
                      const outB = checkOutBooking || booking;

                      return (
                        <td key={dateStr} className="p-1 border-r border-slate-200 text-center">
                          <div className="w-full h-[60px] flex flex-col justify-between gap-1">
                            {/* Top Row: Check-Out */}
                            <button
                              type="button"
                              onClick={() => outB && onViewBookingDetails(outB)}
                              className="w-full h-[27px] rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold px-1.5 py-0.5 text-left flex items-center justify-between text-[10px] overflow-hidden cursor-pointer shadow-2xs transition"
                              title={`Check-Out: ${outB?.guestName}`}
                            >
                              <span className="text-[8px] uppercase font-black bg-sky-700/80 px-1 py-0.2 rounded text-sky-100 shrink-0">OUT</span>
                              <span className="truncate font-bold ml-1 text-right">{outB?.guestName}</span>
                            </button>

                            {/* Bottom Row: Book New Check-In */}
                            <button
                              type="button"
                              onClick={() => onSelectCellBooking(room, dateStr)}
                              className="w-full h-[27px] rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 font-bold px-1.5 py-0.5 flex items-center justify-center gap-1 text-[10px] transition cursor-pointer"
                              title={`Click to book new check-in for ${room.name} on ${formatDateReadable(dateStr)}`}
                            >
                              <Plus className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="text-[9px] font-bold">Book In</span>
                            </button>
                          </div>
                        </td>
                      );
                    }

                    // Check-In Day
                    if (type === 'check_in') {
                      const inB = checkInBooking || booking;

                      return (
                        <td key={dateStr} className="p-1 border-r border-slate-200 text-center">
                          <button
                            onClick={() => inB && onViewBookingDetails(inB)}
                            className="w-full h-[60px] rounded-xl p-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 font-bold transition text-left flex flex-col justify-between overflow-hidden cursor-pointer shadow-2xs"
                            title={`Check-In: ${inB?.guestName}`}
                          >
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-amber-950">
                              <span>Check-In</span>
                              <span className="text-[8px] bg-amber-600/30 px-1 py-0.2 rounded font-black">IN</span>
                            </div>
                            <div className="text-[10px] font-bold truncate leading-tight">
                              {inB?.guestName}
                            </div>
                          </button>
                        </td>
                      );
                    }

                    // Booked (Stay)
                    return (
                      <td key={dateStr} className="p-1 border-r border-slate-200 text-center">
                        <button
                          onClick={() => booking && onViewBookingDetails(booking)}
                          className="w-full h-[60px] rounded-xl p-1.5 bg-rose-500 hover:bg-rose-600 text-white border border-rose-600 font-bold transition text-left flex flex-col justify-between overflow-hidden cursor-pointer shadow-2xs"
                          title={`Guest: ${booking?.guestName}\nStatus: ${booking?.status}\nNights: ${booking?.nights}`}
                        >
                          <div className="flex items-center justify-between text-[9px] font-bold opacity-90">
                            <span className="truncate">Booked</span>
                          </div>
                          <div className="text-[10px] font-bold truncate leading-tight">
                            {booking?.guestName}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
