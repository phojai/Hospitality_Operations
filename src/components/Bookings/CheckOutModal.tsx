import React, { useState } from 'react';
import { Booking, Room, Property } from '../../types';
import {
  formatCurrency,
  formatDateReadable,
  getBookingRoomNames
} from '../../utils/bookingUtils';
import {
  X,
  LogOut,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  Calendar,
  Building2,
  ShieldCheck,
  Check
} from 'lucide-react';

interface CheckOutModalProps {
  booking: Booking;
  rooms: Room[];
  properties?: Property[];
  onConfirmCheckOut: (bookingId: string, paymentMethod: 'Cash' | 'Online', reference?: string) => void;
  onClose: () => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  booking,
  rooms = [],
  properties = [],
  onConfirmCheckOut,
  onClose
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(true);

  // Property info
  const currentProperty = properties.find(p => p.id === (booking.propertyId || 'p-nohshring'));
  const propertyName = currentProperty ? currentProperty.name : 'Nohshring Homestay';

  const roomNames = getBookingRoomNames(booking, rooms);

  // Financial calculations
  const totalAmount = booking.totalAmount || 0;
  const advancePaid = booking.advanceAmount !== undefined
    ? booking.advanceAmount
    : (booking.paymentStatus === 'Paid' ? totalAmount : 0);

  const balanceDue = Math.max(0, totalAmount - advancePaid);

  const handleCompleteCheckOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (balanceDue > 0 && !isConfirmed) return;
    onConfirmCheckOut(booking.id, paymentMethod, paymentReference);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Guest Check-Out & Bill Settlement</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" /> {propertyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleCompleteCheckOut} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          
          {/* Guest & Stay Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">GUEST DETAILS</span>
                <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" /> {booking.guestName}
                </span>
                <span className="text-xs text-slate-500 font-mono">📞 {booking.guestMobile}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">REF & ROOM</span>
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
                  {booking.bookingNumber}
                </span>
                <div className="text-xs font-bold text-emerald-700 mt-1">{roomNames}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-600 pt-0.5">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDateReadable(booking.checkInDate)} → {formatDateReadable(booking.checkOutDate)}
              </span>
              <span className="font-bold text-slate-800">{booking.nights} Night(s)</span>
            </div>
          </div>

          {/* Financial Breakdown & Balance Banner */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 flex items-center justify-between border-b border-slate-200">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-slate-600" /> Financial Bill Summary
              </span>
              <span className="text-[11px] text-slate-500">Code: {booking.confirmationCode}</span>
            </div>

            <div className="p-3.5 space-y-2 bg-white">
              <div className="flex justify-between text-slate-600">
                <span>Total Invoice Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="flex justify-between text-emerald-700">
                <span>Advance Paid Previously:</span>
                <span className="font-bold">-{formatCurrency(advancePaid)}</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between mt-2 ${
                balanceDue > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block">
                    {balanceDue > 0 ? 'REMAINING BALANCE BILL DUE' : 'BILL PAYMENT STATUS'}
                  </span>
                  <span className="text-lg font-black">{formatCurrency(balanceDue)}</span>
                </div>
                {balanceDue > 0 ? (
                  <span className="px-2.5 py-1 bg-amber-200 text-amber-900 font-bold text-xs rounded-lg flex items-center gap-1 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Pending Settlement
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 font-bold text-xs rounded-lg flex items-center gap-1 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Fully Paid
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Selector for Bill Adjustment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
              Adjust Balance Bill By Payment Mode <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">Select how the remaining bill amount of {formatCurrency(balanceDue > 0 ? balanceDue : totalAmount)} is being settled:</p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Option 1: Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition cursor-pointer ${
                  paymentMethod === 'Cash'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mb-1.5 ${paymentMethod === 'Cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-xs">1. CASH</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Desk Cash Payment</span>
              </button>

              {/* Option 2: Online */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Online')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition cursor-pointer ${
                  paymentMethod === 'Online'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl mb-1.5 ${paymentMethod === 'Online' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-xs">2. ONLINE</span>
                <span className="text-[10px] text-slate-500 mt-0.5">UPI / QR / GPay / Card</span>
              </button>
            </div>
          </div>

          {/* Reference / Transaction Note Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Transaction Ref / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder={paymentMethod === 'Cash' ? 'e.g. Received by receptionist' : 'e.g. UPI Ref #9876543210'}
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Confirmation Checkbox for Due Balance */}
          {balanceDue > 0 && (
            <label className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={e => setIsConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
              />
              <span className="text-xs text-slate-700 font-medium leading-tight">
                Confirm that the balance bill of <strong className="text-emerald-800">{formatCurrency(balanceDue)}</strong> has been collected and adjusted via <strong className="text-slate-900 uppercase">{paymentMethod}</strong>.
              </span>
            </label>
          )}

          {/* Modal Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={balanceDue > 0 && !isConfirmed}
              className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer ${
                balanceDue > 0 && !isConfirmed
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {balanceDue > 0
                  ? `Adjust ${formatCurrency(balanceDue)} (${paymentMethod}) & Check-Out`
                  : `Confirm Check-Out (${paymentMethod})`}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
