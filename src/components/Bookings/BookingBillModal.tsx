import React, { useState } from 'react';
import { Booking, Room, Property } from '../../types';
import {
  formatCurrency,
  formatDateReadable,
  getBookingRoomNames,
  getWhatsAppShareUrl
} from '../../utils/bookingUtils';
import { Printer, MessageSquare, Share2, Check, X, FileText, Receipt, Building2, MapPin, Phone, Mail, LogOut } from 'lucide-react';

interface BookingBillModalProps {
  booking: Booking;
  rooms: Room[];
  properties?: Property[];
  onCheckOut?: (bookingId: string) => void;
  onClose: () => void;
}

export const BookingBillModal: React.FC<BookingBillModalProps> = ({
  booking,
  rooms,
  properties = [],
  onCheckOut,
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Find associated property
  const currentProperty = properties.find(p => p.id === (booking.propertyId || 'p-nohshring')) || {
    name: 'Nohshring Homestay',
    address: 'Near Karbi Club, Umrangso, Dima Hasao, Assam - 788819',
    phone: '+91 7086015740',
    email: 'stay@nohshring.com',
    gstin: '18AABCN1234F1Z5'
  };

  const roomNames = getBookingRoomNames(booking, rooms);
  const roomSubtotal = (booking.baseRatePerNight || 0) * (booking.nights || 1);
  const extraBedTotal = (booking.extraBedCount || 0) * (booking.extraBedRatePerNight || 500) * (booking.nights || 1);
  const fbTotal = booking.foodAndBeverageCharges || 0;
  const kgTotal = booking.kitchenAndGasCharges || 0;
  const subtotal = roomSubtotal + extraBedTotal + fbTotal + kgTotal;
  const discount = booking.discountAmount || 0;
  const taxableValue = Math.max(0, subtotal - discount);
  const taxAmount = booking.taxAmount || 0;
  const grandTotal = booking.totalAmount || Math.max(0, taxableValue + taxAmount);
  const advancePaid = booking.advanceAmount !== undefined ? booking.advanceAmount : (booking.paymentStatus === 'Paid' ? grandTotal : 0);
  const balanceDue = Math.max(0, grandTotal - advancePaid);

  const invoiceNumber = `INV-${booking.bookingNumber}`;
  const todayDateStr = formatDateReadable(new Date().toISOString().split('T')[0]);

  const generateInvoiceShareText = () => {
    let fbItemsSummary = '';
    if (booking.foodAndBeverageItems && booking.foodAndBeverageItems.length > 0) {
      fbItemsSummary = booking.foodAndBeverageItems
        .map(i => `   • ${i.name} (x${i.qty}) = ${formatCurrency(i.amount)}`)
        .join('\n');
    }

    let kgItemsSummary = '';
    if (booking.kitchenAndGasItems && booking.kitchenAndGasItems.length > 0) {
      kgItemsSummary = booking.kitchenAndGasItems
        .map(i => `   • ${i.name} (${i.days || 1} day[s]) = ${formatCurrency(i.amount)}`)
        .join('\n');
    }

    return `🧾 *${currentProperty.name.toUpperCase()} - OFFICIAL TAX INVOICE & BILL*
Invoice No: ${invoiceNumber}
Date: ${todayDateStr}

👤 *Guest Details:*
Name: ${booking.guestName}
Mobile: ${booking.guestMobile}
Assigned Room(s): ${roomNames}
Stay Period: ${formatDateReadable(booking.checkInDate)} to ${formatDateReadable(booking.checkOutDate)} (${booking.nights} Nights)

----------------------------------
*BILL PARTICULAR BREAKDOWN:*
1. Room Stay Charge: ${formatCurrency(roomSubtotal)} (${booking.nights} Nights)
${booking.extraBedCount && booking.extraBedCount > 0 ? `2. Extra Bed (${booking.extraBedCount} Beds): ${formatCurrency(extraBedTotal)}\n` : ''}${fbTotal > 0 ? `3. Food & Beverages / Room Service: ${formatCurrency(fbTotal)}\n${fbItemsSummary}\n` : ''}${kgTotal > 0 ? `4. Kitchen & Gas Equipment Rental: ${formatCurrency(kgTotal)}\n${kgItemsSummary}\n` : ''}----------------------------------
Subtotal: ${formatCurrency(subtotal)}
${discount > 0 ? `Discount Applied: -${formatCurrency(discount)}\n` : ''}GST (5%): ${booking.isGstExempt ? 'Waived (0%)' : formatCurrency(taxAmount)}
*GRAND TOTAL BILL:* ${formatCurrency(grandTotal)}
Advance Paid: ${formatCurrency(advancePaid)}
*NET BALANCE DUE:* ${formatCurrency(balanceDue)} (${booking.paymentStatus})

Thank you for staying at ${currentProperty.name}! 🌿
For queries call: ${currentProperty.phone}`;
  };

  const handleCopyInvoice = () => {
    const text = generateInvoiceShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = generateInvoiceShareText();
    window.open(getWhatsAppShareUrl(booking.guestMobile, text), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tax Invoice & Final Bill</h3>
              <p className="text-xs text-slate-500">Printable & shareable official homestay folio</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Invoice Container */}
        <div id="print-tax-invoice" className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-800">
          
          {/* Header Branding */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase text-amber-300">{currentProperty.name}</h2>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-amber-400" />
                {currentProperty.address}
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>📞 {currentProperty.phone}</span> • <span>✉️ {currentProperty.email}</span>
                {currentProperty.gstin && <span>• GSTIN: {currentProperty.gstin}</span>}
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
              <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black tracking-wider uppercase block sm:inline-block">
                Tax Invoice & Bill
              </span>
              <p className="font-mono text-xs font-bold text-white mt-1">{invoiceNumber}</p>
              <p className="text-[10px] text-slate-400">Date: {todayDateStr}</p>
            </div>
          </div>

          {/* Guest & Stay Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">BILLED TO (GUEST):</p>
              <p className="text-xs font-bold text-slate-900">{booking.guestName}</p>
              <p className="text-[11px] text-slate-600">Mobile: {booking.guestMobile}</p>
              {booking.guestEmail && <p className="text-[11px] text-slate-600">Email: {booking.guestEmail}</p>}
              <p className="text-[11px] text-slate-600">Guests: {booking.numberOfGuests} Person(s)</p>
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">STAY DETAILS & STATUS:</p>
              <p className="text-xs font-bold text-emerald-800">Room(s): {roomNames}</p>
              <p className="text-[11px] text-slate-600">
                Check-In: <strong>{formatDateReadable(booking.checkInDate)}</strong>
              </p>
              <p className="text-[11px] text-slate-600">
                Check-Out: <strong>{formatDateReadable(booking.checkOutDate)}</strong> ({booking.nights} Nights)
              </p>
              <div className="pt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  booking.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                  booking.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  Payment Status: {booking.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Particulars Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5 w-12 text-center">#</th>
                  <th className="p-2.5">Item Description / Particulars</th>
                  <th className="p-2.5 text-center w-20">Qty/Nights</th>
                  <th className="p-2.5 text-right w-24">Rate (₹)</th>
                  <th className="p-2.5 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* 1. Room Stay */}
                <tr>
                  <td className="p-2.5 text-center font-bold text-slate-500">1</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900">Room Accommodation ({roomNames})</p>
                    <p className="text-[10px] text-slate-500">
                      From {formatDateReadable(booking.checkInDate)} to {formatDateReadable(booking.checkOutDate)}
                    </p>
                  </td>
                  <td className="p-2.5 text-center font-semibold text-slate-700">{booking.nights} Nights</td>
                  <td className="p-2.5 text-right text-slate-700">{formatCurrency(booking.baseRatePerNight)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(roomSubtotal)}</td>
                </tr>

                {/* 2. Extra Beds if any */}
                {booking.extraBedCount && booking.extraBedCount > 0 ? (
                  <tr>
                    <td className="p-2.5 text-center font-bold text-slate-500">2</td>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900">Extra Bed Charges</p>
                      <p className="text-[10px] text-slate-500">
                        {booking.extraBedCount} Bed(s) × {booking.nights} Nights @ {formatCurrency(booking.extraBedRatePerNight || 500)}/night
                      </p>
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-700">{booking.extraBedCount} Beds</td>
                    <td className="p-2.5 text-right text-slate-700">{formatCurrency(booking.extraBedRatePerNight || 500)}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(extraBedTotal)}</td>
                  </tr>
                ) : null}

                {/* 3. Food & Beverages if any */}
                {fbTotal > 0 ? (
                  <tr>
                    <td className="p-2.5 text-center font-bold text-slate-500">
                      {booking.extraBedCount && booking.extraBedCount > 0 ? '3' : '2'}
                    </td>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900">Food & Beverages / Room Service</p>
                      {booking.foodAndBeverageItems && booking.foodAndBeverageItems.length > 0 ? (
                        <div className="mt-1 space-y-0.5 text-[10px] text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-100">
                          {booking.foodAndBeverageItems.map((item, i) => (
                            <div key={item.id || i} className="flex justify-between">
                              <span>• {item.name} ({item.qty}x)</span>
                              <span className="font-semibold">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500">Consolidated F&B Charges</p>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-700">
                      {booking.foodAndBeverageItems ? `${booking.foodAndBeverageItems.length} Items` : '1 Service'}
                    </td>
                    <td className="p-2.5 text-right text-slate-700">—</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(fbTotal)}</td>
                  </tr>
                ) : null}

                {/* 4. Kitchen & Gas Equipments if any */}
                {kgTotal > 0 ? (
                  <tr>
                    <td className="p-2.5 text-center font-bold text-slate-500">
                      {(booking.extraBedCount && booking.extraBedCount > 0 ? 1 : 0) + (fbTotal > 0 ? 1 : 0) + 2}
                    </td>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900">Kitchen & Gas Equipment Rental</p>
                      {booking.kitchenAndGasItems && booking.kitchenAndGasItems.length > 0 ? (
                        <div className="mt-1 space-y-0.5 text-[10px] text-slate-600 bg-orange-50/60 p-2 rounded border border-orange-100">
                          {booking.kitchenAndGasItems.map((item, i) => (
                            <div key={item.id || i} className="flex justify-between">
                              <span>• {item.name} ({item.days || 1} day[s] @ {formatCurrency(item.price)})</span>
                              <span className="font-semibold">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500">Consolidated Kitchen & Gas Charges</p>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-700">
                      {booking.kitchenAndGasItems ? `${booking.kitchenAndGasItems.length} Rental(s)` : '1 Rental'}
                    </td>
                    <td className="p-2.5 text-right text-slate-700">—</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(kgTotal)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Totals Summary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Less: Special Discount:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-semibold">{formatCurrency(taxableValue)}</span>
            </div>

            <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-1.5">
              <span>GST / Tax (5% CGST+SGST):</span>
              {booking.isGstExempt ? (
                <span className="font-bold text-emerald-700">Waived (0% Exempt)</span>
              ) : (
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
              )}
            </div>

            <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
              <span>GRAND TOTAL INVOICE AMOUNT:</span>
              <span className="text-base text-emerald-800">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1">
              <span>Less: Advance Amount Paid:</span>
              <span className="font-bold text-emerald-700">-{formatCurrency(advancePaid)}</span>
            </div>

            <div className="flex justify-between text-sm font-extrabold p-2 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 mt-2">
              <span>BALANCE PAYABLE / DUE:</span>
              <span className="text-base">{formatCurrency(balanceDue)}</span>
            </div>
          </div>

          {/* Terms & Footer */}
          <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-500 space-y-0.5">
            <p className="font-bold text-slate-700">Terms & Conditions:</p>
            <p>1. Check-out time is strictly 11:00 AM. Late check-out subject to room availability.</p>
            <p>2. Payment strictly accepted via UPI, Bank Transfer, or Cash at reception.</p>
            <p>3. This is a computer-generated tax invoice. Signature not required.</p>
          </div>

        </div>

        {/* Footer Action Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end items-center gap-2 shrink-0">
          {booking.status === 'checked_in' && onCheckOut && (
            <button
              onClick={() => {
                onClose();
                onCheckOut(booking.id);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition mr-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Adjust Bill & Check-Out</span>
            </button>
          )}

          <button
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <MessageSquare className="w-4 h-4" /> Share Bill on WhatsApp
          </button>

          <button
            onClick={handleCopyInvoice}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Bill Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>Copy Invoice Text</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </button>
        </div>

      </div>
    </div>
  );
};
