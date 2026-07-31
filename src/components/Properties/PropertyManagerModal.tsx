import React, { useState } from 'react';
import { Property, Room, Booking } from '../../types';
import { Building2, Plus, Edit2, Trash2, Check, X, ShieldCheck, MapPin, Phone, Mail, FileText, Sparkles, Home } from 'lucide-react';

interface PropertyManagerModalProps {
  properties: Property[];
  rooms: Room[];
  bookings: Booking[];
  selectedPropertyId: string;
  onSelectProperty: (propertyId: string) => void;
  onAddProperty: (newProperty: Property) => void;
  onUpdateProperty: (updatedProperty: Property) => void;
  onDeleteProperty?: (propertyId: string) => void;
  onClose: () => void;
}

export const PropertyManagerModal: React.FC<PropertyManagerModalProps> = ({
  properties = [],
  rooms = [],
  bookings = [],
  selectedPropertyId,
  onSelectProperty,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onClose
}) => {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Umrangso');
  const [state, setState] = useState<string>('Assam');
  const [pincode, setPincode] = useState<string>('788819');
  const [phone, setPhone] = useState<string>('+91 ');
  const [email, setEmail] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const openAddForm = () => {
    setName('');
    setTagline('');
    setAddress('');
    setCity('Umrangso');
    setState('Assam');
    setPincode('788819');
    setPhone('+91 ');
    setEmail('');
    setGstin('');
    setErrorMsg('');
    setEditingPropertyId(null);
    setIsAdding(true);
  };

  const openEditForm = (prop: Property) => {
    setName(prop.name);
    setTagline(prop.tagline || '');
    setAddress(prop.address || '');
    setCity(prop.city || 'Umrangso');
    setState(prop.state || 'Assam');
    setPincode(prop.pincode || '788819');
    setPhone(prop.phone || '');
    setEmail(prop.email || '');
    setGstin(prop.gstin || '');
    setErrorMsg('');
    setIsAdding(false);
    setEditingPropertyId(prop.id);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Property name is required.');
      return;
    }

    if (editingPropertyId) {
      const existing = properties.find(p => p.id === editingPropertyId);
      if (!existing) return;

      const updated: Property = {
        ...existing,
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim() || undefined
      };

      onUpdateProperty(updated);
      setEditingPropertyId(null);
    } else {
      const newProp: Property = {
        id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim() || undefined,
        isDefault: properties.length === 0,
        createdAt: new Date().toISOString()
      };

      onAddProperty(newProp);
      setIsAdding(false);
      onSelectProperty(newProp.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Multi-Property Portfolio Manager</h3>
              <p className="text-xs text-slate-500">Manage multiple homestays & resorts from one central platform</p>
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
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Top Bar Actions */}
          {!isAdding && !editingPropertyId && (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Your Homestay Properties ({properties.length})</p>
                <p className="text-[11px] text-slate-500">Click a property to switch dashboard view or add new locations</p>
              </div>

              <button
                type="button"
                onClick={openAddForm}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Property
              </button>
            </div>
          )}

          {/* Form for Add/Edit */}
          {(isAdding || editingPropertyId) && (
            <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {editingPropertyId ? 'Edit Property Details' : 'Register New Homestay / Resort Property'}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingPropertyId(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pine View Resort"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tagline / Slogan</label>
                  <input
                    type="text"
                    placeholder="e.g. Luxury Eco-Stay near Golf Course"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Full Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Golf Course Road, Near Karbi Club"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">State & PIN</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-2/3 px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                    />
                    <input
                      type="text"
                      value={pincode}
                      onChange={e => setPincode(e.target.value)}
                      className="w-1/3 px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 7086015740"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="stay@homestay.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="18AABCN1234F1Z5"
                    value={gstin}
                    onChange={e => setGstin(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingPropertyId(null);
                  }}
                  className="px-4 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save Property
                </button>
              </div>
            </form>
          )}

          {/* Combined Portfolio Overview Card */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Combined Portfolio View (All Properties)</h4>
                <p className="text-[11px] text-slate-400">View aggregate occupancy, calendar, and bookings across all properties</p>
              </div>
            </div>

            <button
              onClick={() => {
                onSelectProperty('all');
                onClose();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                selectedPropertyId === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {selectedPropertyId === 'all' ? <Check className="w-3.5 h-3.5" /> : null}
              Select Combined View
            </button>
          </div>

          {/* Properties List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Individual Property Locations ({properties.length})
            </span>

            <div className="grid grid-cols-1 gap-3">
              {properties.map(prop => {
                const propRooms = rooms.filter(r => (r.propertyId || 'p-nohshring') === prop.id);
                const propBookings = bookings.filter(b => (b.propertyId || 'p-nohshring') === prop.id);
                const isSelected = selectedPropertyId === prop.id;

                return (
                  <div
                    key={prop.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/50 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{prop.name}</span>
                        {prop.isDefault && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                            Primary / Default
                          </span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                          {propRooms.length} Rooms • {propBookings.length} Bookings
                        </span>
                      </div>

                      {prop.tagline && <p className="text-xs text-emerald-800 italic font-medium">{prop.tagline}</p>}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                        {prop.address && (
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {prop.address}, {prop.city}
                          </p>
                        )}
                        {prop.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {prop.phone}
                          </p>
                        )}
                        {prop.email && (
                          <p className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {prop.email}
                          </p>
                        )}
                        {prop.gstin && (
                          <p className="flex items-center gap-1 font-mono text-slate-500">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" /> GSTIN: {prop.gstin}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => openEditForm(prop)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Edit Property Info"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {onDeleteProperty && !prop.isDefault && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete property "${prop.name}"?`)) {
                              onDeleteProperty(prop.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Property"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onSelectProperty(prop.id);
                          onClose();
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Active Property
                          </>
                        ) : (
                          'Switch to Property'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <p>Multi-tenant architecture active. Existing Nohshring Homestay records are 100% retained.</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
