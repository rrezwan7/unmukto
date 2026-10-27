import { checkAdminApi } from "@/lib/admin-auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const layoutId = Number(id);

  if (!Number.isSafeInteger(layoutId) || layoutId <= 0) {
    return Response.json(
      { success: false, error: "Invalid layout ID." },
      { status: 400 }
    );
  }

  try {
    const { db } = await import("@/prisma/db");

    const layout = await db.orm.public.SeatLayout
      .where({ id: layoutId })
      .first();

    if (!layout) {
      return Response.json(
        { success: false, error: "Seat layout not found." },
        { status: 404 }
      );
    }

    const seats = await db.orm.public.Seat
      .where({ seatLayoutId: layoutId })
      .all();

    seats.sort(
      (a, b) =>
        (a.rowNumber ?? 0) - (b.rowNumber ?? 0) ||
        (a.columnNumber ?? 0) - (b.columnNumber ?? 0) ||
        a.id - b.id
    );

    return Response.json(
      { success: true, layout, seats },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET LAYOUT SEATS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load layout seats." },
      { status: 500 }
    );
  }
}
export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id } = await params;
  const layoutId = Number(id);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!Number.isSafeInteger(layoutId) || layoutId <= 0) {
    return badRequest("Invalid layout ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  if (
    !body ||
    !Array.isArray(body.seats) ||
    body.seats.length === 0 ||
    body.seats.length > 100
  ) {
    return badRequest("Provide between 1 and 100 seats.");
  }

  type SeatInput = {
    seatLayoutId: number;
    seatNumber: string;
    rowNumber: number;
    columnNumber: number;
    isAvailable: boolean;
  };

  const seats: SeatInput[] = [];
  const labels = new Set<string>();
  const positions = new Set<string>();

  for (const seat of body.seats) {
    if (
      !seat ||
      typeof seat !== "object" ||
      typeof seat.seatNumber !== "string"
    ) {
      return badRequest("Each seat needs a seat number.");
    }

    const seatNumber = seat.seatNumber.trim().toUpperCase();

    if (!seatNumber || seatNumber.length > 20) {
      return badRequest("Seat numbers must contain 1–20 characters.");
    }

    if (
      !Number.isInteger(seat.rowNumber) ||
      seat.rowNumber < 1 ||
      seat.rowNumber > 100 ||
      !Number.isInteger(seat.columnNumber) ||
      seat.columnNumber < 1 ||
      seat.columnNumber > 100
    ) {
      return badRequest("Seat rows and columns must be between 1 and 100.");
    }

    if (typeof seat.isAvailable !== "boolean") {
      return badRequest("Specify availability for every seat.");
    }

    const position = `${seat.rowNumber}:${seat.columnNumber}`;

    if (labels.has(seatNumber) || positions.has(position)) {
      return badRequest("Seat numbers and positions cannot repeat.");
    }

    labels.add(seatNumber);
    positions.add(position);

    seats.push({
      seatLayoutId: layoutId,
      seatNumber,
      rowNumber: seat.rowNumber,
      columnNumber: seat.columnNumber,
      isAvailable: seat.isAvailable,
    });
  }

  try {
    const { db } = await import("@/prisma/db");

    const layout = await db.orm.public.SeatLayout
      .where({ id: layoutId })
      .first();

    if (!layout) {
      return Response.json(
        { success: false, error: "Seat layout not found." },
        { status: 404 }
      );
    }

    const existing = await db.orm.public.Seat
      .where({ seatLayoutId: layoutId })
      .all();

    const overlaps = existing.some(
      (seat) =>
        labels.has(seat.seatNumber.trim().toUpperCase()) ||
        (
          seat.rowNumber !== null &&
          seat.columnNumber !== null &&
          positions.has(`${seat.rowNumber}:${seat.columnNumber}`)
        )
    );

    if (overlaps) {
      return Response.json(
        {
          success: false,
          error: "A seat number or position already exists in this layout.",
        },
        { status: 409 }
      );
    }

    const created = await db.orm.public.Seat.createAll(seats);

    return Response.json(
      { success: true, seats: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE LAYOUT SEATS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to save seats." },
      { status: 500 }
    );
  }
}