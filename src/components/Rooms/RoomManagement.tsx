import React, { useState } from 'react';
import { Room, RoomType, RoomStatus } from '../../types';
import { formatCurrency } from '../../utils/bookingUtils';
import { uploadRoomPhotoToFirebaseStorage } from '../../lib/firebase';
import { compressImage } from '../../utils/imageUtils';
import {
  BedDouble,
  Plus,
  Edit,
  Power,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  X,
  Maximize2,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface RoomManagementProps {
  rooms: Room[];
  onAddRoom: (newRoom: Room) => void;
  onUpdateRoom: (updatedRoom: Room) => void;
  onToggleRoomStatus: (roomId: string) => void;
  onArchiveRoom: (roomId: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  rooms = [],
  onAddRoom,
  onUpdateRoom,
  onToggleRoomStatus,
  onArchiveRoom
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Card Image Index State for Rooms with multiple images
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});

  // Gallery Modal State
  const [selectedGalleryRoom, setSelectedGalleryRoom] = useState<Room | null>(null);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState<number>(0);

  // Form State for Add / Edit
  const [name, setName] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [type, setType] = useState<RoomType>('Cottage');
  const [capacity, setCapacity] = useState<number | ''>(4);
  const [pricePerNight, setPricePerNight] = useState<number>(2500);
  const [amenitiesInput, setAmenitiesInput] = useState<string>('Mountain View, Free WiFi, Hot Shower, Breakfast Included');
  const [notes, setNotes] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80'
  ]);

  // Upload progress state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string>('');

  const openAddModal = () => {
    setName('');
    setRoomNumber(`${100 + rooms.length + 1}`);
    setType('Cottage');
    setCapacity(4);
    setPricePerNight(2500);
    setAmenitiesInput('Mountain View, Free WiFi, Hot Shower, Breakfast Included');
    setNotes('');
    setImageUrls([
      'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80'
    ]);
    setShowAddModal(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setRoomNumber(room.roomNumber);
    setType(room.type);
    setCapacity(room.capacity);
    setPricePerNight(room.pricePerNight);
    setAmenitiesInput(room.amenities.join(', '));
    setNotes(room.notes || '');
    
    // Set image URLs list from room.images or room.imageUrl
    if (room.images && room.images.length > 0) {
      setImageUrls([...room.images]);
    } else if (room.imageUrl) {
      setImageUrls([room.imageUrl]);
    } else {
      setImageUrls([]);
    }
  };

  const handleAddImageUrlField = () => {
    setImageUrls(prev => [...prev, '']);
  };

  const handleUpdateImageUrl = (index: number, val: string) => {
    setImageUrls(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveImageUrl = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);
    setUploadSuccessMessage('');

    const tag = editingRoom?.id || (roomNumber ? `room-${roomNumber}` : `room-${Date.now()}`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        // 1. Compress image to max 1024x1024, ~80-120KB payload
        let compressedDataUrl = '';
        let fileToUpload = file;
        try {
          const compressed = await compressImage(file, 1024, 1024, 0.82);
          compressedDataUrl = compressed.dataUrl;
          fileToUpload = compressed.compressedFile;
          setUploadProgress(40);
        } catch (compressErr) {
          console.warn('Image compression fallback:', compressErr);
        }

        // 2. Attempt Firebase Storage direct bucket upload
        try {
          const downloadUrl = await uploadRoomPhotoToFirebaseStorage(fileToUpload, tag, (pct) => {
            setUploadProgress(Math.max(40, pct));
          });
          setImageUrls(prev => [...prev.filter(url => url.trim() !== ''), downloadUrl]);
        } catch (storageErr) {
          console.warn('Firebase Storage direct upload notice (CORS/bucket preflight fallback):', storageErr);
          setUploadProgress(95);
          // 3. Fallback to optimized compressed data URL (only ~80KB, well within local storage)
          const fallbackUrl = compressedDataUrl || (await readFileAsDataUrl(file));
          setImageUrls(prev => [...prev.filter(url => url.trim() !== ''), fallbackUrl]);
        }
      }
      setUploadSuccessMessage('Photo(s) added to room gallery!');
      setTimeout(() => setUploadSuccessMessage(''), 4000);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveRoom = () => {
    if (!name.trim() || !roomNumber.trim()) return;

    const amenitiesArray = amenitiesInput
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const validImages = imageUrls.map(i => i.trim()).filter(i => i.length > 0);
    const primaryImage = validImages[0] || 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80';

    if (editingRoom) {
      const updated: Room = {
        ...editingRoom,
        name,
        roomNumber,
        type,
        capacity: typeof capacity === 'number' ? capacity : 0,
        pricePerNight,
        amenities: amenitiesArray,
        notes,
        imageUrl: primaryImage,
        images: validImages.length > 0 ? validImages : [primaryImage]
      };
      onUpdateRoom(updated);
      setEditingRoom(null);
    } else {
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        name,
        roomNumber,
        type,
        capacity: typeof capacity === 'number' ? capacity : 0,
        pricePerNight,
        amenities: amenitiesArray,
        status: 'active',
        notes,
        imageUrl: primaryImage,
        images: validImages.length > 0 ? validImages : [primaryImage],
        createdAt: new Date().toISOString()
      };
      onAddRoom(newRoom);
      setShowAddModal(false);
    }
  };

  const activeRooms = rooms.filter(r => r.status === 'active');
  const deactivatedRooms = rooms.filter(r => r.status === 'deactivated');
  const visibleRooms = rooms.filter(r => {
    if (r.status === 'archived') return false;
    if (filterType !== 'All' && r.type !== filterType) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.roomNumber.toLowerCase().includes(q);
    }
    return true;
  });

  const nextCardImage = (roomId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIndices(prev => {
      const curr = prev[roomId] || 0;
      return { ...prev, [roomId]: (curr + 1) % totalImages };
    });
  };

  const prevCardImage = (roomId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardImageIndices(prev => {
      const curr = prev[roomId] || 0;
      return { ...prev, [roomId]: (curr - 1 + totalImages) % totalImages };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-emerald-600" />
            <span>Dynamic Room Inventory & Photo Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, update pricing, upload multiple room photos, or toggle availability in real time.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 font-medium uppercase text-[10px]">Total Rooms</span>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{rooms.filter(r => r.status !== 'archived').length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-emerald-600 font-semibold uppercase text-[10px]">Active Inventory</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{activeRooms.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-amber-600 font-semibold uppercase text-[10px]">Deactivated</span>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{deactivatedRooms.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-indigo-600 font-semibold uppercase text-[10px]">Max Guest Capacity</span>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">
            {activeRooms.reduce((acc, r) => acc + r.capacity, 0)} Guests
          </p>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleRooms.map(room => {
          const roomImages = (room.images && room.images.length > 0)
            ? room.images
            : (room.imageUrl ? [room.imageUrl] : []);
          
          const currentImgIndex = (cardImageIndices[room.id] || 0) % (roomImages.length || 1);
          const activeImgSrc = roomImages[currentImgIndex] || room.imageUrl || '';

          return (
            <div
              key={room.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between transition ${
                room.status === 'deactivated' ? 'opacity-60 border-slate-300' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {activeImgSrc && (
                <div className="h-48 w-full bg-slate-100 relative group overflow-hidden">
                  <img
                    src={activeImgSrc}
                    alt={room.name}
                    className="w-full h-full object-cover transition-all duration-300"
                    referrerPolicy="no-referrer"
                  />

                  {/* Top Badges */}
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-slate-900/80 text-white font-bold text-[10px] rounded-full backdrop-blur-xs">
                    Room #{room.roomNumber}
                  </span>

                  <span
                    className={`absolute top-3 right-3 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      room.status === 'active'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {room.status === 'active' ? 'Active' : 'Deactivated'}
                  </span>

                  {/* Multi-image carousel controls & badge */}
                  {roomImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => prevCardImage(room.id, roomImages.length, e)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-xs transition opacity-90 group-hover:opacity-100 cursor-pointer"
                        title="Previous Image"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => nextCardImage(room.id, roomImages.length, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-xs transition opacity-90 group-hover:opacity-100 cursor-pointer"
                        title="Next Image"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Photo indicator count badge */}
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-slate-950/70 text-white font-bold text-[10px] rounded-md backdrop-blur-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-emerald-400" />
                        <span>{currentImgIndex + 1} / {roomImages.length} Photos</span>
                      </span>

                      {/* Dots indicator */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1">
                        {roomImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardImageIndices(prev => ({ ...prev, [room.id]: idx }));
                            }}
                            className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === currentImgIndex ? 'bg-emerald-400 w-3' : 'bg-white/70'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Full Gallery View Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGalleryRoom(room);
                      setGalleryActiveIndex(currentImgIndex);
                    }}
                    className="absolute top-3 left-24 p-1 bg-slate-900/60 hover:bg-slate-900 text-white rounded-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Open Fullscreen Gallery"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{room.name}</h3>
                    <p className="text-xs text-slate-500">{room.type}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900">{formatCurrency(room.pricePerNight)}</span>
                    <span className="text-[10px] text-slate-400 block">/ night</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Accommodates up to <strong className="text-slate-800">{room.capacity} Guests</strong></span>
                </div>

                {room.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                    "{room.notes}"
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {room.amenities.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Room Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onToggleRoomStatus(room.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
                    room.status === 'active'
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{room.status === 'active' ? 'Deactivate' : 'Reactivate'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(room)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                    title="Edit Room Details & Images"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onArchiveRoom(room.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="Archive Room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT ROOM WITH MULTI-IMAGE SUPPORT */}
      {(showAddModal || editingRoom) && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingRoom ? `Edit Details for ${editingRoom.name}` : 'Add New Room to Inventory'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRoom(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Room 2 Balcony"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as RoomType)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Cottage">Cottage</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="Garden Villa">Garden Villa</option>
                    <option value="Standard Room">Standard Room</option>
                    <option value="Family Suite">Family Suite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min={0}
                    value={capacity}
                    placeholder="0"
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setCapacity('');
                      } else {
                        const parsed = parseInt(raw, 10);
                        setCapacity(isNaN(parsed) ? '' : Math.max(0, parsed));
                      }
                    }}
                    onBlur={() => {
                      if (capacity === '') {
                        setCapacity(0);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price / Night (₹)</label>
                  <input
                    type="number"
                    step={100}
                    value={pricePerNight === 0 ? '' : pricePerNight}
                    placeholder="2500"
                    onChange={e => {
                      const raw = e.target.value;
                      setPricePerNight(raw === '' ? 0 : Math.max(0, parseInt(raw) || 0));
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 font-bold text-emerald-800 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={amenitiesInput}
                  onChange={e => setAmenitiesInput(e.target.value)}
                  placeholder="Private Balcony, Free WiFi, Tea Maker..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              {/* Room Pictures Management Section */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Room Pictures ({imageUrls.length} Added)</span>
                  </label>

                  <label className={`px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1 transition ${
                    isUploading ? 'opacity-60 pointer-events-none' : ''
                  }`}>
                    {isUploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    <span>{isUploading ? 'Uploading to Firebase...' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {isUploading && (
                  <div className="space-y-1 py-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>Uploading to Firebase Cloud Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadSuccessMessage && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{uploadSuccessMessage}</span>
                  </div>
                )}

                {imageUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-12">Photo #{idx + 1}</span>
                    <input
                      type="text"
                      value={url}
                      onChange={e => handleUpdateImageUrl(idx, e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                    />
                    {imageUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImageUrl(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddImageUrlField}
                  className="mt-1 text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Image URL Field
                </button>

                {/* Thumbnail Previews */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  {imageUrls.filter(u => u.trim() !== '').map((url, i) => (
                    <div key={i} className="h-16 rounded-lg overflow-hidden border border-slate-300 relative bg-slate-200">
                      <img
                        src={url}
                        alt={`Preview ${i + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[9px] px-1 rounded font-bold">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional room notes or view details..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRoom(null);
                }}
                className="px-4 py-2 text-xs bg-slate-100 text-slate-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoom}
                className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
              >
                Save Room Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN GALLERY MODAL */}
      {selectedGalleryRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedGalleryRoom.name} — Photo Gallery</h3>
                <p className="text-xs text-slate-400">
                  Room #{selectedGalleryRoom.roomNumber} • {formatCurrency(selectedGalleryRoom.pricePerNight)} / night
                </p>
              </div>
              <button
                onClick={() => setSelectedGalleryRoom(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-black relative flex items-center justify-center p-4 min-h-[350px]">
              {(() => {
                const imgs = (selectedGalleryRoom.images && selectedGalleryRoom.images.length > 0)
                  ? selectedGalleryRoom.images
                  : (selectedGalleryRoom.imageUrl ? [selectedGalleryRoom.imageUrl] : []);

                const currSrc = imgs[galleryActiveIndex % imgs.length] || '';

                return (
                  <>
                    <img
                      src={currSrc}
                      alt={selectedGalleryRoom.name}
                      className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg"
                      referrerPolicy="no-referrer"
                    />

                    {imgs.length > 1 && (
                      <>
                        <button
                          onClick={() => setGalleryActiveIndex((galleryActiveIndex - 1 + imgs.length) % imgs.length)}
                          className="absolute left-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => setGalleryActiveIndex((galleryActiveIndex + 1) % imgs.length)}
                          className="absolute right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Gallery Thumbnails row */}
            {(() => {
              const imgs = (selectedGalleryRoom.images && selectedGalleryRoom.images.length > 0)
                ? selectedGalleryRoom.images
                : (selectedGalleryRoom.imageUrl ? [selectedGalleryRoom.imageUrl] : []);

              if (imgs.length <= 1) return null;

              return (
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-3">
                  {imgs.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => setGalleryActiveIndex(idx)}
                      className={`h-16 w-24 rounded-lg overflow-hidden border-2 transition ${
                        galleryActiveIndex === idx ? 'border-emerald-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

