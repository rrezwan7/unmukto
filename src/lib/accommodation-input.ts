import { Temporal } from "temporal-polyfill";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

export function parseHotel(input: unknown) {
  if (!isRecord(input)) return { error: "Hotel information is required." };
  const { name, location, address, phone, description, isActive } = input;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
    return { error: "Provide a hotel name of 1–150 characters." };
  }
  if (typeof location !== "string" || !location.trim() || location.trim().length > 150) {
    return { error: "Provide a location of 1–150 characters." };
  }
  if (address != null && (typeof address !== "string" || address.length > 500)) {
    return { error: "Address must contain at most 500 characters." };
  }
  if (phone != null && (typeof phone !== "string" || phone.length > 50)) {
    return { error: "Phone must contain at most 50 characters." };
  }
  if (description != null && (typeof description !== "string" || description.length > 2000)) {
    return { error: "Description must contain at most 2,000 characters." };
  }
  if (typeof isActive !== "boolean") {
    return { error: "Specify whether the hotel is active." };
  }
  return {
    hotel: {
      name: name.trim(),
      location: location.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      description: description?.trim() || null,
      isActive,
    },
  } as const;
}

export function parseRoom(input: unknown) {
  if (!isRecord(input)) return { error: "Room details are required." };
  const roomNumber = String(input.roomNumber ?? "").trim().toUpperCase();
  if (!roomNumber || roomNumber.length > 50) {
    return { error: "Provide a room number of 1–50 characters." };
  }
  const { roomType, description } = input;
  if (roomType !== "SHARED" && roomType !== "COUPLE" && roomType !== "PRIVATE") {
    return { error: "Choose SHARED, COUPLE, or PRIVATE room type." };
  }
  const capacity = Number(input.capacity);
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 20) {
    return { error: "Capacity must be an integer between 1 and 20." };
  }
  if (description != null && (typeof description !== "string" || description.length > 1000)) {
    return { error: "Description must contain at most 1,000 characters." };
  }
  return { room: { roomNumber, roomType, capacity, description: description?.trim() || null } } as const;
}

export function parseStay(input: unknown) {
  if (!isRecord(input)) return { error: "Hotel stay details are required." };
  const hotelId = Number(input.hotelId);
  if (!isDatabaseId(hotelId)) return { error: "Select a valid hotel." };
  const destinationId = input.destinationId == null ? input.destinationId : Number(input.destinationId);
  if (destinationId != null && !isDatabaseId(destinationId)) {
    return { error: "Select a valid itinerary stop." };
  }

  const checkIn = String(input.checkInDate ?? "").trim();
  const checkOut = String(input.checkOutDate ?? "").trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(checkIn)) return { error: "Provide a valid check-in date (YYYY-MM-DD)." };
  if (!datePattern.test(checkOut)) return { error: "Provide a valid check-out date (YYYY-MM-DD)." };

  try {
    const checkInDate = Temporal.Instant.from(`${checkIn}T12:00:00+06:00`);
    const checkOutDate = Temporal.Instant.from(`${checkOut}T12:00:00+06:00`);
    if (Temporal.Instant.compare(checkOutDate, checkInDate) <= 0) {
      return { error: "Check-out date must be after check-in date." };
    }
    return { stay: { hotelId, destinationId, checkInDate, checkOutDate } } as const;
  } catch {
    return { error: "Invalid date values." };
  }
}
