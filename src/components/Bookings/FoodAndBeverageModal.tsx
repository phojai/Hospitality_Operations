import React, { useState } from 'react';
import { Booking, FoodAndBeverageItem, Room } from '../../types';
import { formatCurrency, getBookingRoomNames } from '../../utils/bookingUtils';
import { Coffee, Utensils, Plus, Trash2, X, Save, Check, ShoppingBag, Sparkles } from 'lucide-react';

interface FoodAndBeverageModalProps {
  booking: Booking;
  rooms: Room[];
  onSave: (updatedBooking: Booking) => void;
  onClose: () => void;
}

const PRESET_FB_ITEMS: Omit<FoodAndBeverageItem, 'id' | 'amount' | 'qty'>[] = [
  { name: 'Assam Masala Tea / Coffee', price: 40, category: 'Beverages' },
  { name: 'Deluxe Homestay Breakfast', price: 180, category: 'Breakfast' },
  { name: 'Traditional Assamese Thali (Veg)', price: 250, category: 'Lunch' },
  { name: 'Special Local Chicken Thali', price: 320, category: 'Dinner' },
  { name: 'Fresh River Fish Curry Meal', price: 350, category: 'Dinner' },
  { name: 'Evening Pakora & Snacks Platter', price: 120, category: 'Snacks' },
  { name: 'Mineral Water (1L Bottle)', price: 30, category: 'Beverages' },
  { name: 'Fresh Juice / Cold Drink', price: 80, category: 'Beverages' }
];

export const FoodAndBeverageModal: React.FC<FoodAndBeverageModalProps> = ({
  booking,
  rooms,
  onSave,
  onClose
}) => {
  const [items, setItems] = useState<FoodAndBeverageItem[]>(
    booking.foodAndBeverageItems || []
  );

  // Custom Item Form State
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<number>(100);
  const [customQty, setCustomQty] = useState<number>(1);
  const [customCategory, setCustomCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Beverages' | 'Snacks' | 'Custom'>('Custom');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleAddPreset = (preset: Omit<FoodAndBeverageItem, 'id' | 'amount' | 'qty'>) => {
    const existingIndex = items.findIndex(i => i.name === preset.name && i.price === preset.price);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      updated[existingIndex].amount = updated[existingIndex].qty * updated[existingIndex].price;
      setItems(updated);
    } else {
      const newItem: FoodAndBeverageItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: preset.name,
        category: preset.category,
        price: preset.price,
        qty: 1,
        amount: preset.price,
        date: new Date().toISOString().split('T')[0]
      };
      setItems([...items, newItem]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newItem: FoodAndBeverageItem = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: customName.trim(),
      category: customCategory,
      price: Math.max(0, customPrice),
      qty: Math.max(1, customQty),
      amount: Math.max(0, customPrice * customQty),
      notes: customNotes.trim() || undefined,
      date: new Date().toISOString().split('T')[0]
    };

    setItems([...items, newItem]);
    setCustomName('');
    setCustomPrice(100);
    setCustomQty(1);
    setCustomNotes('');
  };

  const handleUpdateQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setItems(prev =>
      prev.map(i => {
        if (i.id === id) {
          const qty = newQty;
          return { ...i, qty, amount: qty * i.price };
        }
        return i;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalFbCharges = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSaveAndCalculate = () => {
    const roomSubtotal = (booking.baseRatePerNight || 0) * (booking.nights || 1);
    const extraBedTotal = (booking.extraBedCount || 0) * (booking.extraBedRatePerNight || 500) * (booking.nights || 1);
    const subtotal = roomSubtotal + extraBedTotal + totalFbCharges;

    const effectiveDiscount = Math.min(subtotal, booking.discountAmount || 0);
    const taxableAmount = Math.max(0, subtotal - effectiveDiscount);
    const taxAmount = booking.isGstExempt ? 0 : Math.round(taxableAmount * 0.05);
    const totalAmount = Math.max(0, taxableAmount + taxAmount);

    const advance = booking.advanceAmount || 0;
    let paymentStatus = booking.paymentStatus;
    if (advance >= totalAmount) paymentStatus = 'Paid';
    else if (advance > 0) paymentStatus = 'Partial';
    else paymentStatus = 'Pending';

    const updatedBooking: Booking = {
      ...booking,
      foodAndBeverageCharges: totalFbCharges,
      foodAndBeverageItems: items,
      taxAmount,
      totalAmount,
      discountAmount: effectiveDiscount,
      paymentStatus
    };

    onSave(updatedBooking);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const roomNames = getBookingRoomNames(booking, rooms);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Food & Beverages / Room Service</h3>
              <p className="text-xs text-slate-500">
                Reservation: <strong className="text-slate-800">{booking.bookingNumber}</strong> • Guest: <strong>{booking.guestName}</strong> ({roomNames})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          
          {/* Quick Menu Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Add Popular Food & Drinks:
              </span>
              <span className="text-[11px] text-slate-400">Click to add to bill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_FB_ITEMS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="p-2.5 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl text-left transition flex flex-col justify-between cursor-pointer group shadow-2xs"
                >
                  <span className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-amber-900">
                    {preset.name}
                  </span>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-amber-700">{formatCurrency(preset.price)}</span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold group-hover:bg-amber-300">
                      + Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Add Custom F&B Item Form */}
          <form onSubmit={handleAddCustom} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Add Custom Food / Beverage Order</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Item Name (e.g., Egg Maggi, Mineral Water)"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <input
                  type="number"
                  min={0}
                  placeholder="Price (₹)"
                  value={customPrice || ''}
                  onChange={e => setCustomPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={customQty || ''}
                  onChange={e => setCustomQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Custom">Custom Order</option>
              </select>

              <input
                type="text"
                placeholder="Optional notes / room service detail"
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                className="flex-1 px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
              />

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </form>

          {/* Current F&B Items List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-slate-600" />
                Current F&B Charges Breakdown ({items.length} Items)
              </h4>
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                F&B Total: {formatCurrency(totalFbCharges)}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                <Coffee className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                No food or beverage items charged yet. Use the presets above to add room service items.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs bg-white shadow-2xs">
                {items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{item.name}</span>
                        {item.category && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatCurrency(item.price)} each {item.notes ? `• ${item.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                          className="px-2 py-0.5 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                          className="px-2 py-0.5 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold text-slate-900 w-16 text-right">
                        {formatCurrency(item.amount)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] text-slate-500">Total F&B Charges Added to Bill:</p>
            <p className="text-base font-extrabold text-slate-900">{formatCurrency(totalFbCharges)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndCalculate}
              disabled={saveSuccess}
              className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Updated Booking!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save F&B Charges
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
