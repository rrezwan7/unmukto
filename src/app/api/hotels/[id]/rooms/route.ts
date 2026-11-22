import { checkAdminApi } from "@/lib/admin-auth";
import { lockHotel, roomNumberExists } from "@/lib/accommodation-editor";
import { parseRoom } from "@/lib/accommodation-input";
import { isDatabaseId } from "@/lib/tour-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const hotelId = Number(id);

  if (!isDatabaseId(hotelId)) {
    return Response.json(
      { success: false, error: "Invalid hotel ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const hotel = await db.orm.public.Hotel
      .where({ id: hotelId })
      .first();

    if (!hotel) {
      return Response.json(
        { success: false, error: "Hotel not found." },
        { status: 404 }
      );
    }

    const rooms = await db.orm.public.Room
      .where({ hotelId })
      .all();

    rooms.sort((a, b) =>
      a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }) ||
      a.id - b.id
    );

    return Response.json(
      { success: true, hotel, rooms },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET HOTEL ROOMS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load hotel rooms." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const hotelId = Number(id);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!isDatabaseId(hotelId)) {
    return badRequest("Invalid hotel ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const input = parseRoom(body);
  if (!input.room) return badRequest(input.error);

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      if (!await lockHotel(tx, hotelId)) {
        return Response.json({ success: false, error: "Hotel not found." }, { status: 404 });
      }
      const { roomNumber } = input.room;
      if (await roomNumberExists(tx, hotelId, roomNumber)) {
        return Response.json({ success: false, error: `Room ${roomNumber} already exists in this hotel.` }, { status: 409 });
      }
      const room = await tx.orm.public.Room.create({ hotelId, ...input.room });
      return Response.json({ success: true, room }, { status: 201 });
    });
  } catch (error) {
    console.error("CREATE ROOM ERROR:", error);
    return Response.json({ success: false, error: "Unable to create room." }, { status: 500 });
  }
}
