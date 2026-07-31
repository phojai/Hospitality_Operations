# Firestore Security Specification

## 1. Data Invariants
- Rooms: `id`, `name`, `type`, `capacity`, `pricePerNight` are required.
- Bookings: `id`, `bookingNumber`, `roomId`, `guestName`, `checkInDate`, `checkOutDate`, `totalAmount` are required.
- Guests: `id`, `name`, `mobile` are required.
- All users (authenticated and public) can read room data, bookings, and guests in this homestay applet.
- Authenticated and anonymous operations allow creating and updating room, booking, and guest records.

## 2. Dirty Dozen Payloads
1. Attempting to write a Room without an ID
2. Attempting to set Room capacity to negative
3. Attempting to create a Booking without guestName
4. Attempting to inject extra non-string types into amenity list
5. Attempting to write a Booking with invalid checkInDate format
6. Attempting to overwrite system timestamps
7. Attempting to create an invalid GuestProfile without a mobile number
8. Attempting to inject junk characters into document ID
9. Attempting to overwrite room status with an arbitrary status
10. Attempting to write negative price per night
11. Attempting to inject 1MB string into room notes
12. Attempting to delete rooms without authorization
