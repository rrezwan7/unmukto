import { lockRoom } from "@/lib/accommodation-editor";
import { checkAdminApi } from "@/lib/admin-auth";
import { roomAvailability } from "@/lib/room-capacity";
import { roomCommitments, stayNights } from "@/lib/room-inventory";
import { canAssignPassenger, holdIsActive, lockHotelStay } from "@/lib/reservation-inventory";

type Props = {
  params: Promise<{ id: string; stayId: string }>;
};

const validId = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value > 0 && value <= 2_147_483_647;

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id, stayId: stayIdParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayIdParam);

  if (!validId(departureId) || !validId(stayId)) {
    return Response.json(
      { success: false, error: "Invalid departure or stay ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const stay = await db.orm.public.HotelStay
      .where({ id: stayId })
      .first();

    if (!stay || stay.departureId !== departureId) {
      return Response.json(
        { success: false, error: "Hotel stay not found for this departure." },
        { status: 404 }
      );
    }

    const [hotel, rooms, bookings, assignments, commitments] = await Promise.all([
      db.orm.public.Hotel.where({ id: stay.hotelId }).first(),
      db.orm.public.Room.where({ hotelId: stay.hotelId }).all(),
      db.orm.public.Booking.where({ departureId }).all(),
      db.orm.public.RoomAssignment.where({ hotelStayId: stayId })
        .include("passenger", (passenger) => passenger.select("bookingId")).all(),
      roomCommitments(stay.hotelId),
    ]);

    rooms.sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }) ||
      a.id - b.id
    );

    const now = Date.now();
    const activeBookings = bookings.filter((booking) => holdIsActive(booking, now));

    const bookingMap = new Map(activeBookings.map((b) => [b.id, b]));

    // Load passengers for active bookings
    const allPassengers = await Promise.all(
      activeBookings.map((b) =>
        db.orm.public.Passenger.where({ bookingId: b.id }).all()
      )
    );
    const passengers = allPassengers.flat();
    passengers.sort((a, b) => a.bookingId - b.bookingId || a.id - b.id);

    const roomMap = new Map(rooms.map((r) => [r.id, r]));
    const assignmentByPassenger = new Map(
      assignments.map((a) => [a.passengerId, a])
    );

    const bookingIdsByRoom = new Map<number, Set<number>>();
    for (const assignment of assignments) {
      if (!assignment.passenger) continue;
      const bookingIds = bookingIdsByRoom.get(assignment.roomId) ?? new Set<number>();
      bookingIds.add(assignment.passenger.bookingId);
      bookingIdsByRoom.set(assignment.roomId, bookingIds);
    }

    const nights = stayNights(stay);
    const enrichedRooms = rooms.map((room) => {
      const inventory = roomAvailability(room, nights, commitments.get(room.id) ?? []);
      return {
        id: room.id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        capacity: room.capacity,
        description: room.description,
        occupied: inventory.assigned,
        allotted: inventory.allotted,
        availableForAllotment: inventory.available,
        availableSlots: inventory.availableSlots,
        isFull: inventory.availableSlots === 0,
        overbooked: inventory.overbooked,
        exclusive: inventory.exclusive,
        bookingIds: [...(bookingIdsByRoom.get(room.id) ?? [])],
      };
    });

    const enrichedPassengers = passengers.map((passenger) => {
      const booking = bookingMap.get(passenger.bookingId);
      const assignment = assignmentByPassenger.get(passenger.id);
      const assignedRoom = assignment ? roomMap.get(assignment.roomId) : null;

      return {
        id: passenger.id,
        name: passenger.name,
        passengerType: passenger.passengerType,
        bookingId: passenger.bookingId,
        bookingNumber: booking?.bookingNumber ?? "",
        bookingStatus: booking?.status ?? "PENDING",
        canAssign: booking ? canAssignPassenger(booking) : false,
        assignment: assignment
          ? {
              id: assignment.id,
              roomId: assignment.roomId,
              roomNumber: assignedRoom?.roomNumber ?? "Unknown",
              roomType: assignedRoom?.roomType ?? "UNKNOWN",
            }
          : null,
      };
    });

    return Response.json(
      {
        success: true,
        stay: {
          id: stay.id,
          departureId: stay.departureId,
          hotelId: stay.hotelId,
          hotelName: hotel?.name ?? "Unknown Hotel",
          hotelLocation: hotel?.location ?? "Unknown Location",
          checkInDate: stay.checkInDate.toString(),
          checkOutDate: stay.checkOutDate.toString(),
        },
        rooms: enrichedRooms,
        passengers: enrichedPassengers,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET ROOM ASSIGNMENTS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load room assignments." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id, stayId: stayIdParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayIdParam);

  const fail = (error: string, status = 400) =>
    Response.json({ success: false, error }, { status });

  if (!validId(departureId) || !validId(stayId)) {
    return fail("Invalid departure or stay ID.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON.");
  }

  if (!body || !validId(body.passengerId) || !validId(body.roomId)) {
    return fail("Provide valid passenger and room IDs.");
  }

  const { passengerId, roomId } = body;

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      const stay = await lockHotelStay(tx, departureId, stayId);
      if (!stay) {
        return fail("Hotel stay not found for this departure.", 404);
      }

      const passenger = await tx.orm.public.Passenger
        .where({ id: passengerId })
        .first();

      if (!passenger) {
        return fail("Passenger not found.", 404);
      }

      const booking = await tx.orm.public.Booking
        .where({ id: passenger.bookingId })
        .first();

      if (!booking || booking.departureId !== departureId) {
        return fail("Passenger does not belong to this departure.", 409);
      }

      if (!canAssignPassenger(booking)) {
        return fail("This booking cannot receive a room assignment.", 409);
      }

      if (!await lockRoom(tx, stay.hotelId, roomId)) {
        return fail("Room does not belong to this stay's hotel.", 409);
      }
      const room = await tx.orm.public.Room
        .where({ id: roomId })
        .first();

      if (!room || room.hotelId !== stay.hotelId) {
        return fail("Room does not belong to this stay's hotel.", 409);
      }

      const currentRoomAssignments = await tx.orm.public.RoomAssignment
        .where({ hotelStayId: stayId })
        .include("passenger", (passenger) => passenger.select("bookingId"))
        .all();

      const occupantsInTargetRoom = currentRoomAssignments.filter(
        (a) => a.roomId === roomId
      );

      const existingPassengerAssignment = currentRoomAssignments.find(
        (a) => a.passengerId === passengerId
      );

      // If passenger is already in this exact room, no-op
      if (existingPassengerAssignment?.roomId === roomId) {
        return Response.json({
          success: true,
          assignment: existingPassengerAssignment,
        });
      }

      const scheduledStay = await tx.orm.public.HotelStay.where({ id: stayId }).first();
      if (!scheduledStay) return fail("Hotel stay not found for this departure.", 404);
      const commitments = await roomCommitments(stay.hotelId, roomId, tx);
      const inventory = roomAvailability(room, stayNights(scheduledStay), commitments.get(roomId) ?? []);
      if (inventory.exclusive &&
          occupantsInTargetRoom.some((assignment) => assignment.passenger?.bookingId !== booking.id)) {
        return fail("This exclusive room is already in use by another booking on this stay.", 409);
      }
      if (inventory.availableSlots === 0) {
        return fail(inventory.assigned >= room.capacity
          ? `Room ${room.roomNumber} is full (capacity: ${room.capacity} occupants).`
          : `Room ${room.roomNumber} has insufficient capacity on at least one night because of overlapping stays.`, 409);
      }

      let assignment;
      if (existingPassengerAssignment) {
        // Update existing assignment for this stay
        assignment = await tx.orm.public.RoomAssignment
          .where({ id: existingPassengerAssignment.id })
          .update({ roomId });
      } else {
        // Create new assignment
        assignment = await tx.orm.public.RoomAssignment.create({
          passengerId,
          hotelStayId: stayId,
          roomId,
        });
      }

      return Response.json(
        { success: true, assignment },
        { status: 200 }
      );
    });
  } catch (error) {
    console.error("ASSIGN ROOM ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to assign room." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id, stayId: stayIdParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayIdParam);

  const fail = (error: string, status = 400) =>
    Response.json({ success: false, error }, { status });

  if (!validId(departureId) || !validId(stayId)) {
    return fail("Invalid departure or stay ID.");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON.");
  }

  if (!body || !validId(body.passengerId)) {
    return fail("Provide a valid passenger ID.");
  }

  const { passengerId } = body;

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      if (!(await lockHotelStay(tx, departureId, stayId))) {
        return fail("Hotel stay not found for this departure.", 404);
      }

      const existing = await tx.orm.public.RoomAssignment
        .where({ passengerId, hotelStayId: stayId })
        .first();

      if (!existing) {
        return fail("Passenger has no room assignment for this stay.", 404);
      }

      await tx.orm.public.RoomAssignment
        .where({ id: existing.id })
        .delete();

      return Response.json({ success: true });
    });
  } catch (error) {
    console.error("UNASSIGN ROOM ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to unassign room." },
      { status: 500 }
    );
  }
}
