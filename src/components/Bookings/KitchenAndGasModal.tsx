import React, { useState } from 'react';
import { Booking, KitchenEquipmentItem, Room } from '../../types';
import { formatCurrency, getBookingRoomNames } from '../../utils/bookingUtils';
import { Flame, Utensils, Plus, Trash2, X, Save, Check, ShieldAlert, Sparkles, ChefHat } from 'lucide-react';

interface KitchenAndGasModalProps {
  booking: Booking;
  rooms: Room[];
  onSave: (updatedBooking: Booking) => void;
  onClose: () => void;
}

const PRESET_KITCHEN_EQUIPMENT: Omit<KitchenEquipmentItem, 'id' | 'amount' | 'qty'>[] = [
  { name: 'LPG Gas Cylinder & Stove Use', price: 300, category: 'Gas Equipment' },
  { name: 'Full Kitchen Utensils & Cookware Set', price: 200, category: 'Utensils & Cookware' },
  { name: 'Induction Cooktop & Compatible Pots', price: 250, category: 'Appliances' },
  { name: 'BBQ Grill & Charcoal Barbecue Set', price: 500, category: 'Barbecue & Grill' },
  { name: 'Commercial Heavy Burner & Cooking Handi', price: 400, category: 'Gas Equipment' },
  { name: 'Electric Kettle & Microwave Access', price: 150, category: 'Appliances' },
  { name: 'Cutlery & Dinnerware Set (10+ Pax)', price: 150, category: 'Utensils & Cookware' },
  { name: 'Outdoor Open Air Cooking Stove Kit', price: 350, category: 'Gas Equipment' }
];

export const KitchenAndGasModal: React.FC<KitchenAndGasModalProps> = ({
  booking,
  rooms,
  onSave,
  onClose
}) => {
  const [items, setItems] = useState<KitchenEquipmentItem[]>(
    booking.kitchenAndGasItems || []
  );

  // Form state for custom item
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<number>(300);
  const [customDays, setCustomDays] = useState<number>(booking.nights || 1);
  const [customCategory, setCustomCategory] = useState<'Gas Equipment' | 'Utensils & Cookware' | 'Appliances' | 'Barbecue & Grill' | 'Custom'>('Gas Equipment');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleAddPreset = (preset: Omit<KitchenEquipmentItem, 'id' | 'amount' | 'qty'>) => {
    const existingIndex = items.findIndex(i => i.name === preset.name && i.price === preset.price);
    const daysToUse = booking.nights || 1;
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].days = (updated[existingIndex].days || 1) + 1;
      updated[existingIndex].amount = (updated[existingIndex].days || 1) * updated[existingIndex].price;
      setItems(updated);
    } else {
      const newItem: KitchenEquipmentItem = {
        id: `kg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: preset.name,
        category: preset.category,
        price: preset.price,
        qty: 1,
        days: daysToUse,
        amount: preset.price * daysToUse,
      };
      setItems([...items, newItem]);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const daysVal = Math.max(1, customDays);
    const priceVal = Math.max(0, customPrice);

    const newItem: KitchenEquipmentItem = {
      id: `kg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: customName.trim(),
      category: customCategory,
      price: priceVal,
      qty: 1,
      days: daysVal,
      amount: priceVal * daysVal,
      notes: customNotes.trim() || undefined
    };

    setItems([...items, newItem]);
    setCustomName('');
    setCustomPrice(300);
    setCustomDays(booking.nights || 1);
    setCustomNotes('');
  };

  const handleUpdateDays = (id: string, newDays: number) => {
    if (newDays <= 0) {
      handleRemoveItem(id);
      return;
    }
    setItems(prev =>
      prev.map(i => {
        if (i.id === id) {
          const days = newDays;
          return { ...i, days, amount: days * i.price };
        }
        return i;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalKitchenAndGasCharges = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSaveAndCalculate = () => {
    const roomSubtotal = (booking.baseRatePerNight || 0) * (booking.nights || 1);
    const extraBedTotal = (booking.extraBedCount || 0) * (booking.extraBedRatePerNight || 500) * (booking.nights || 1);
    const fbCharges = booking.foodAndBeverageCharges || 0;
    
    const subtotal = roomSubtotal + extraBedTotal + fbCharges + totalKitchenAndGasCharges;

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
      kitchenAndGasCharges: totalKitchenAndGasCharges,
      kitchenAndGasItems: items,
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-orange-600 text-white rounded-xl shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Kitchen & Gas Equipment Rental Charges</h3>
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
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
          
          {/* Quick Equipment Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Quick Add Kitchen & Gas Equipment Presets:
              </span>
              <span className="text-[11px] text-slate-400">Click preset to add for {booking.nights || 1} night(s)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_KITCHEN_EQUIPMENT.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="p-2.5 bg-orange-50/70 hover:bg-orange-100/90 border border-orange-200 rounded-xl text-left transition flex flex-col justify-between cursor-pointer group shadow-2xs"
                >
                  <span className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-orange-950">
                    {preset.name}
                  </span>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-orange-200/60">
                    <span className="text-xs font-bold text-orange-800">{formatCurrency(preset.price)}/day</span>
                    <span className="text-[10px] bg-orange-200 text-orange-900 px-1.5 py-0.5 rounded font-bold group-hover:bg-orange-300">
                      + Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Add Custom Kitchen Item Form */}
          <form onSubmit={handleAddCustom} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-orange-600" />
              Add Custom Kitchen / Gas Equipment Charge
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Equipment Name (e.g. Extra Gas Ring, Oven, Barbecue)"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-orange-500 font-medium"
                  required
                />
              </div>

              <div>
                <input
                  type="number"
                  min={0}
                  placeholder="Rate per Day (₹)"
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
                  placeholder="Days"
                  value={customDays || ''}
                  onChange={e => setCustomDays(parseInt(e.target.value) || 1)}
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
                <option value="Gas Equipment">Gas Equipment</option>
                <option value="Utensils & Cookware">Utensils & Cookware</option>
                <option value="Appliances">Appliances</option>
                <option value="Barbecue & Grill">Barbecue & Grill</option>
                <option value="Custom">Custom Equipment</option>
              </select>

              <input
                type="text"
                placeholder="Optional equipment notes / usage details"
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                className="flex-1 px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none"
              />

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Charge
              </button>
            </div>
          </form>

          {/* Current Equipment List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-600" />
                Kitchen & Gas Charges Itemized ({items.length} Items)
              </h4>
              <span className="text-xs font-extrabold text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
                Equipment Total: {formatCurrency(totalKitchenAndGasCharges)}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                <Utensils className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                No kitchen or gas equipment charges added yet. Click any preset above or add a custom rental item.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs bg-white shadow-2xs">
                {items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{item.name}</span>
                        {item.category && (
                          <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatCurrency(item.price)} / day {item.notes ? `• ${item.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleUpdateDays(item.id, (item.days || 1) - 1)}
                          className="px-2 py-0.5 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                          title="Decrease Days"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.days || 1} day(s)</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateDays(item.id, (item.days || 1) + 1)}
                          className="px-2 py-0.5 hover:bg-slate-200 font-bold text-slate-700 cursor-pointer"
                          title="Increase Days"
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
            <p className="text-[11px] text-slate-500">Total Kitchen & Gas Charges Added to Folio:</p>
            <p className="text-base font-extrabold text-orange-900">{formatCurrency(totalKitchenAndGasCharges)}</p>
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
              className="px-5 py-2 text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Charges Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Kitchen & Gas Charges
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
