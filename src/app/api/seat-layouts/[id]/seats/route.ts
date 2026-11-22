import { checkAdminApi } from "@/lib/admin-auth";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";
import { lockTransportConfiguration, lockTransportDepartures, seatCapacityConflict } from "@/lib/transport-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const layoutId = Number(id);

  if (!isDatabaseId(layoutId)) {
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

type SeatInput = {
  seatNumber: string;
  rowNumber: number | null;
  columnNumber: number | null;
  isAvailable: boolean;
};

function normalizeLabel(label: string) {
  return label.trim().toUpperCase();
}

function isPosition(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100;
}

function parseSeat(input: unknown, allowBlankPosition = false): SeatInput | string {
  if (!isRecord(input) || typeof input.seatNumber !== "string") {
    return "Each seat needs a seat number.";
  }
  const seatNumber = normalizeLabel(input.seatNumber);
  if (!seatNumber || seatNumber.length > 20) return "Seat numbers must contain 1–20 characters.";

  const { rowNumber, columnNumber, isAvailable } = input;
  if ((!isPosition(rowNumber) && !(allowBlankPosition && rowNumber === null)) ||
      (!isPosition(columnNumber) && !(allowBlankPosition && columnNumber === null))) {
    return "Seat rows and columns must be between 1 and 100.";
  }
  if (typeof isAvailable !== "boolean") return "Specify availability for every seat.";
  return { seatNumber, rowNumber, columnNumber, isAvailable };
}

function samePosition(a: SeatInput, b: SeatInput) {
  return a.rowNumber === b.rowNumber && a.columnNumber === b.columnNumber;
}

function overlaps(a: SeatInput, b: SeatInput) {
  return a.seatNumber === normalizeLabel(b.seatNumber) ||
    (a.rowNumber !== null && a.columnNumber !== null && samePosition(a, b));
}

function sharedLayoutMessage(vehicleCount: number) {
  return `This layout is used by ${vehicleCount} vehicles. Confirm the shared change on the layout page.`;
}

function fail(error: string, status = 400) {
  return Response.json({ success: false, error }, { status });
}

export async function POST(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const layoutId = Number((await params).id);
  if (!isDatabaseId(layoutId)) return fail("Invalid layout ID.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON.");
  }
  if (!isRecord(body) || !Array.isArray(body.seats) || body.seats.length === 0 || body.seats.length > 100) {
    return fail("Provide between 1 and 100 seats.");
  }

  const seats: SeatInput[] = [];
  for (const entry of body.seats) {
    const seat = parseSeat(entry);
    if (typeof seat === "string") return fail(seat);
    if (seats.some((existing) => overlaps(seat, existing))) {
      return fail("Seat numbers and positions cannot repeat.");
    }
    seats.push(seat);
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      await lockTransportConfiguration(tx);
      const { Seat, SeatLayout, Vehicle } = tx.orm.public;
      if (!await SeatLayout.where({ id: layoutId }).first()) return fail("Seat layout not found.", 404);
      const vehicles = await Vehicle.where({ seatLayoutId: layoutId }).select("id").all();
      if (vehicles.length > 1 && body.confirmedVehicleCount !== vehicles.length) {
        return fail(sharedLayoutMessage(vehicles.length), 409);
      }

      const existing = await Seat.where({ seatLayoutId: layoutId }).all();
      if (seats.some((seat) => existing.some((item) => overlaps(seat, item)))) {
        return fail("A seat number or position already exists in this layout.", 409);
      }
      const created = await Seat.createAll(seats.map((seat) => ({ ...seat, seatLayoutId: layoutId })));
      return Response.json({ success: true, seats: created }, { status: 201 });
    });
  } catch (error) {
    console.error("CREATE LAYOUT SEATS ERROR:", error);
    return fail("Unable to save seats.", 500);
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;
  const layoutId = Number((await params).id);
  if (!isDatabaseId(layoutId)) return fail("Invalid layout ID.");

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body) || !isDatabaseId(body.seatId) || typeof body.expectedUpdatedAt !== "string") {
    return fail("Provide a seat ID and current version.");
  }
  const { seatId, expectedUpdatedAt, confirmedVehicleCount } = body;
  const input = parseSeat(body, true);
  if (typeof input === "string") return fail(input);

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      await lockTransportConfiguration(tx);
      const { Seat, SeatAssignment, Vehicle } = tx.orm.public;
      const seats = await Seat.where({ seatLayoutId: layoutId }).all();
      const current = seats.find((seat) => seat.id === seatId);
      if (!current) return fail("Seat not found on this layout.", 404);
      if (current.updatedAt !== expectedUpdatedAt) {
        return fail("This seat changed since you opened it. Reload before saving again.", 409);
      }

      const positionChanged = !samePosition(input, current);
      const labelChanged = input.seatNumber !== normalizeLabel(current.seatNumber);
      const disabling = current.isAvailable && !input.isAvailable;
      if (!positionChanged && !labelChanged && input.isAvailable === current.isAvailable) {
        return Response.json({ success: true, seat: current });
      }
      if (positionChanged && (input.rowNumber === null) !== (input.columnNumber === null)) {
        return fail("Enter both row and column, or leave both blank.");
      }
      if (seats.some((seat) => seat.id !== seatId && (
        (labelChanged && input.seatNumber === normalizeLabel(seat.seatNumber)) ||
        (positionChanged && input.rowNumber !== null && samePosition(input, seat))
      ))) {
        return fail("A seat number or position already exists in this layout.", 409);
      }

      const vehicles = await Vehicle.where({ seatLayoutId: layoutId }).select("id").all();
      if (vehicles.length > 1 && confirmedVehicleCount !== vehicles.length) {
        return fail(sharedLayoutMessage(vehicles.length), 409);
      }

      if (disabling || labelChanged || positionChanged) {
        const departures = await lockTransportDepartures(tx, { layoutId });
        if (await SeatAssignment.where({ seatId }).first()) {
          return fail("This seat has passenger assignments. Its label, position, and enabled status must be preserved.", 409);
        }
        if (disabling) {
          for (const { departureId, visibleVehicles } of departures) {
            const conflict = await seatCapacityConflict(tx, departureId, visibleVehicles);
            if (conflict) return fail(conflict, 409);
          }
        }
      }

      const seat = await Seat.where({ id: seatId }).update({
        ...input,
        seatNumber: labelChanged ? input.seatNumber : current.seatNumber,
      });
      return Response.json({ success: true, seat });
    });
  } catch (error) {
    console.error("UPDATE LAYOUT SEAT ERROR:", error);
    return fail("Unable to update seat.", 500);
  }
}
