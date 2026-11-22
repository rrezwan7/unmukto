import { checkAdminApi } from "@/lib/admin-auth";
import { lockRoom } from "@/lib/accommodation-editor";
import { lockHotelStay } from "@/lib/reservation-inventory";
import { roomAvailability, roomUnits } from "@/lib/room-capacity";
import { roomCommitments, stayNights } from "@/lib/room-inventory";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

type Props = { params: Promise<{ id: string; stayId: string }> };

function isQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 20;
}

export async function PUT(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;
  const fail = (error: string, status = 400) => Response.json({ success: false, error }, { status });

  const { id, stayId: stayParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayParam);
  if (!isDatabaseId(departureId) || !isDatabaseId(stayId)) return fail("Invalid departure or stay ID.");

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isDatabaseId(body.roomId) || !isQuantity(body.places) || !isQuantity(body.expectedPlaces)) {
    return fail("Choose a room and enter a valid allotment.");
  }
  const { roomId, places, expectedPlaces } = body;

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      const lockedStay = await lockHotelStay(tx, departureId, stayId);
      if (!lockedStay) return fail("Hotel stay not found on this departure.", 404);
      const { hotelId } = lockedStay;
      if (!await lockRoom(tx, hotelId, roomId)) return fail("Room does not belong to this stay's hotel.", 409);

      const { HotelStay, Room, RoomAllotment } = tx.orm.public;
      const stay = await HotelStay.where({ id: stayId }).first();
      const room = await Room.where({ id: roomId }).first();
      if (!stay || !room) return fail("Hotel stay or room not found.", 404);

      const commitments = await roomCommitments(hotelId, roomId, tx);
      const inventory = roomAvailability(room, stayNights(stay), commitments.get(roomId) ?? []);
      if (places === inventory.allotted) return Response.json({ success: true, places });
      if (expectedPlaces !== inventory.allotted) return fail("This allotment changed. Refresh the room list before saving.", 409);
      if (places > (inventory.exclusive ? 1 : room.capacity)) {
        return fail(inventory.exclusive ? "An exclusive room can be reserved only as a whole room." : "The allotment exceeds the room's capacity.");
      }
      if (!inventory.exclusive && places > 0 && places < inventory.assigned) {
        return fail("The allotment must cover all passengers already assigned to this room. Release it to keep only the assigned places reserved.", 409);
      }

      if (inventory.held > 0 && (places === 0 || (!inventory.exclusive && places < inventory.assigned + inventory.held))) {
        return fail("The allotment must cover active checkout holds and assigned guests.", 409);
      }
      const requested = roomUnits(inventory.exclusive, places, inventory.assigned + inventory.held);
      if (places > inventory.allotted && requested > inventory.available) {
        return fail("This room has insufficient capacity on at least one night because of overlapping stays.", 409);
      }

      if (places === 0) {
        await RoomAllotment.where({ hotelStayId: stayId, roomId }).delete();
      } else {
        await RoomAllotment.upsert({
          conflictOn: { hotelStayId: stayId, roomId },
          create: { hotelStayId: stayId, roomId, places },
          update: { places },
        });
      }
      return Response.json({ success: true, places });
    });
  } catch (error) {
    console.error("SAVE ROOM ALLOTMENT ERROR:", error);
    return fail("Unable to save the room allotment.", 500);
  }
}
