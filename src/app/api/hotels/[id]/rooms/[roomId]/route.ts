import { checkAdminApi } from "@/lib/admin-auth";
import { lockHotel, lockRoom, roomNumberExists } from "@/lib/accommodation-editor";
import { parseRoom } from "@/lib/accommodation-input";
import { peakRoomUsage } from "@/lib/room-capacity";
import { roomCommitments } from "@/lib/room-inventory";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

type Props = { params: Promise<{ id: string; roomId: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const fail = (error: string, status = 400) => Response.json({ success: false, error }, { status });
  const { id, roomId: roomParam } = await params;
  const hotelId = Number(id);
  const roomId = Number(roomParam);
  if (!isDatabaseId(hotelId) || !isDatabaseId(roomId)) return fail("Invalid hotel or room ID.");

  const body: unknown = await request.json().catch(() => null);
  const input = parseRoom(body);
  if (!input.room) return fail(input.error);
  if (!isRecord(body) || typeof body.expectedUpdatedAt !== "string") {
    return fail("Reload the room before editing.");
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      if (!await lockHotel(tx, hotelId)) return fail("Hotel not found.", 404);
      // New and moved assignments also lock the target room before checking capacity.
      if (!await lockRoom(tx, hotelId, roomId)) return fail("Room not found at this hotel.", 404);
      const { Room } = tx.orm.public;
      const current = await Room.where({ id: roomId }).first();
      if (!current || current.updatedAt !== body.expectedUpdatedAt) {
        return fail("This room changed since you opened it. Reload before saving again.", 409);
      }

      const { roomNumber, capacity } = input.room;
      const renaming = roomNumber !== current.roomNumber.trim().toUpperCase();
      if (renaming && await roomNumberExists(tx, hotelId, roomNumber, roomId)) {
        return fail(`Room ${roomNumber} already exists in this hotel.`, 409);
      }
      const shared = current.roomType === "SHARED";
      const changingCapacityModel = shared !== (input.room.roomType === "SHARED");
      if (capacity < current.capacity || changingCapacityModel) {
        const commitments = (await roomCommitments(hotelId, roomId, tx)).get(roomId) ?? [];
        if (changingCapacityModel && commitments.length > 0) {
          return fail("A room with allotments or assignments cannot switch between shared and exclusive.", 409);
        }
        const occupied = commitments.find((commitment) => commitment.assigned > capacity);
        if (occupied) {
          return fail(`Stay #${occupied.stayId} already has more passengers assigned to this room than the proposed capacity.`, 409);
        }
        if (shared && peakRoomUsage(commitments, false) > capacity) {
          return fail("The proposed capacity is below the places reserved or assigned across overlapping stays.", 409);
        }
      }

      const room = await Room.where({ id: roomId }).update({
        ...input.room, roomNumber: renaming ? roomNumber : current.roomNumber,
      });
      return Response.json({ success: true, room });
    });
  } catch (error) {
    console.error("UPDATE ROOM ERROR:", error);
    return fail("Unable to update room.", 500);
  }
}
