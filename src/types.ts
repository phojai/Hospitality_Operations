export type RoomType = 'Cottage' | 'Deluxe Suite' | 'Garden Villa' | 'Standard Room' | 'Family Suite' | 'Luxury Room';

export type RoomStatus = 'active' | 'deactivated' | 'archived';

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'staff';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  tenantId: string; // e.g. 'p-nohshring' | 'p-riverside' | 'all'
  assignedPropertyIds: string[]; // List of property IDs this user is authorized to view
  createdAt?: string;
}

export interface Property {
  id: string;
  name: string;
  tagline?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  phone: string;
  email: string;
  gstin?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Room {
  id: string;
  propertyId?: string;
  roomNumber: string;
  name: string;
  type: RoomType;
  capacity: number;
  pricePerNight: number; // in ₹ INR
  amenities: string[];
  status: RoomStatus;
  notes?: string;
  imageUrl?: string;
  images?: string[]; // Multiple photos array (e.g. up to 2 or more images per room)
  createdAt: string;
}

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type BookingSource = 'Direct' | 'Phone' | 'Walk-in' | 'WhatsApp';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';

export interface FoodAndBeverageItem {
  id: string;
  name: string;
  category?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Beverages' | 'Snacks' | 'Custom';
  qty: number;
  price: number;
  amount: number;
  date?: string;
  notes?: string;
}

export interface KitchenEquipmentItem {
  id: string;
  name: string;
  category?: 'Gas Equipment' | 'Utensils & Cookware' | 'Appliances' | 'Barbecue & Grill' | 'Custom';
  price: number;
  qty: number;
  days?: number;
  amount: number;
  notes?: string;
}

export interface Booking {
  id: string;
  propertyId?: string;
  bookingNumber: string; // e.g. HS-2026-8941
  confirmationCode: string; // e.g. CNF-7742
  roomId: string;
  roomIds?: string[]; // Optional array when multiple rooms are booked together
  guestName: string;
  guestMobile: string;
  guestEmail: string;
  numberOfGuests: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  baseRatePerNight: number;
  taxAmount: number;
  totalAmount: number;
  status: BookingStatus;
  bookingSource: BookingSource;
  paymentStatus: PaymentStatus;
  advanceAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  discountAmount?: number;
  isGstExempt?: boolean;
  extraBedCount?: number;
  extraBedRatePerNight?: number;
  extraBedAmount?: number;
  foodAndBeverageCharges?: number;
  foodAndBeverageItems?: FoodAndBeverageItem[];
  kitchenAndGasCharges?: number;
  kitchenAndGasItems?: KitchenEquipmentItem[];
  specialRequests?: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface GuestProfile {
  id: string;
  name: string;
  mobile: string;
  email: string;
  totalStays: number;
  totalNights: number;
  totalSpend: number;
  lastStayDate: string;
  preferences?: string;
  notes?: string;
  isVIP: boolean;
}

export type CalendarCellType = 'available' | 'booked' | 'check_in' | 'check_out' | 'same_day_turnover' | 'deactivated';

export interface CalendarDayState {
  dateStr: string; // YYYY-MM-DD
  type: CalendarCellType;
  booking?: Booking;
  checkOutBooking?: Booking;
  checkInBooking?: Booking;
}

export interface SearchAvailabilityQuery {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType?: string;
}

export interface AlternativeSuggestion {
  type: 'alternate_dates' | 'alternate_rooms' | 'split_stay';
  title: string;
  description: string;
  recommendedCheckIn?: string;
  recommendedCheckOut?: string;
  recommendedRoomIds?: string[];
}

export interface AvailabilitySearchResult {
  availableRooms: Room[];
  recommendedRooms: Room[];
  unavailableCount: number;
  suggestions: AlternativeSuggestion[];
  totalNights: number;
}

export interface OccupancyStats {
  totalRooms: number;
  occupiedToday: number;
  availableToday: number;
  occupancyRatePercentage: number;
  todayCheckInsCount: number;
  todayCheckOutsCount: number;
  upcomingArrivals7Days: number;
  upcomingDepartures7Days: number;
}

export interface RevenueStats {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  averageDailyRate: number; // ADR
  revenuePerAvailableRoom: number; // RevPAR
  totalBookingsCount: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionDraft?: {
    actionType: 'create_booking' | 'check_availability' | 'view_room';
    guestName?: string;
    mobile?: string;
    email?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    roomId?: string;
    roomName?: string;
  };
}
