import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const hotelId = Number(id);

  if (!Number.isSafeInteger(hotelId) || hotelId <= 0) {
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

  if (!Number.isSafeInteger(hotelId) || hotelId <= 0) {
    return badRequest("Invalid hotel ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Room details are required.");
  }

  const roomNumber = String(body.roomNumber ?? "").trim().toUpperCase();

  if (!roomNumber || roomNumber.length > 50) {
    return badRequest("Provide a room number of 1–50 characters.");
  }

  const roomType = body.roomType;
  if (
    roomType !== "SHARED" &&
    roomType !== "COUPLE" &&
    roomType !== "PRIVATE"
  ) {
    return badRequest("Choose SHARED, COUPLE, or PRIVATE room type.");
  }

  const capacity = Number(body.capacity);
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 20) {
    return badRequest("Capacity must be an integer between 1 and 20.");
  }

  if (
    body.description != null &&
    (typeof body.description !== "string" || body.description.length > 1000)
  ) {
    return badRequest("Description must contain at most 1,000 characters.");
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

    const existing = await db.orm.public.Room
      .where({ hotelId, roomNumber })
      .first();

    if (existing) {
      return Response.json(
        {
          success: false,
          error: `Room ${roomNumber} already exists in this hotel.`,
        },
        { status: 409 }
      );
    }

    const room = await db.orm.public.Room.create({
      hotelId,
      roomNumber,
      roomType,
      capacity,
      description: body.description?.trim() || null,
    });

    return Response.json(
      { success: true, room },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE ROOM ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to create room." },
      { status: 500 }
    );
  }
}
