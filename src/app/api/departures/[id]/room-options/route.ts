import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return Response.json(
      { success: false, error: "Invalid departure ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const departure = await db.orm.public.Departure
      .where({ id: departureId })
      .first();

    if (!departure) {
      return Response.json(
        { success: false, error: "Departure not found." },
        { status: 404 }
      );
    }

    const roomOptions = await db.orm.public.DepartureRoomOption
      .where({ departureId })
      .all();

    roomOptions.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.id - b.id
    );

    return Response.json(
      { success: true, roomOptions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET ROOM OPTIONS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load room options." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return badRequest("Invalid departure ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("A room option is required.");
  }

  const roomType = body.roomType;

  if (
    roomType !== "SHARED" &&
    roomType !== "COUPLE" &&
    roomType !== "PRIVATE"
  ) {
    return badRequest("Choose SHARED, COUPLE, or PRIVATE.");
  }

  const surcharge = String(body.surcharge ?? "");

  if (
    !/^\d+(\.\d{1,2})?$/.test(surcharge) ||
    !Number.isFinite(Number(surcharge))
  ) {
    return badRequest("Surcharge must be a non-negative amount.");
  }

  const validLimit = (value: unknown, minimum: number) =>
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= minimum &&
      value <= 2147483647);

  const maxAdults = body.maxAdults ?? null;
  const maxChildren = body.maxChildren ?? null;
  const maxOccupants = body.maxOccupants ?? null;

  if (
    !validLimit(maxAdults, 1) ||
    !validLimit(maxChildren, 0) ||
    !validLimit(maxOccupants, 1)
  ) {
    return badRequest(
      "Capacity limits must be valid whole numbers or null."
    );
  }

  if (
    roomType === "COUPLE" &&
    (maxAdults === null || maxAdults > 2)
  ) {
    return badRequest("Couple rooms must allow at most two adults.");
  }

  if (
    typeof body.isAvailable !== "boolean" ||
    !validLimit(body.displayOrder, 0) ||
    body.displayOrder === null
  ) {
    return badRequest(
      "Provide availability and a non-negative display order."
    );
  }

  const description = body.description ?? null;

  if (
    description !== null &&
    (typeof description !== "string" || description.length > 2000)
  ) {
    return badRequest(
      "Description must contain at most 2,000 characters."
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const departure = await db.orm.public.Departure
      .where({ id: departureId })
      .first();

    if (!departure) {
      return Response.json(
        { success: false, error: "Departure not found." },
        { status: 404 }
      );
    }

    const values = {
      surcharge,
      maxAdults,
      maxChildren,
      maxOccupants,
      description,
      isAvailable: body.isAvailable,
      displayOrder: body.displayOrder,
    };

    const roomOption = await db.orm.public.DepartureRoomOption.upsert({
      create: {
        departureId,
        roomType,
        ...values,
      },
      update: {
        ...values,
        updatedAt: new Date().toISOString(),
      },
      conflictOn: { departureId, roomType },
    });

    return Response.json({ success: true, roomOption });
  } catch (error) {
    console.error("SAVE ROOM OPTION ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to save room option." },
      { status: 500 }
    );
  }
}