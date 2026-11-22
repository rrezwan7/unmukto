import { checkAdminApi } from "@/lib/admin-auth";
import { lockHotel, stayDateConflict, stopBelongsToTour } from "@/lib/accommodation-editor";
import { parseStay } from "@/lib/accommodation-input";
import { localDepartureDay } from "@/lib/departure-schedule";
import { lockDeparture } from "@/lib/reservation-inventory";
import { isDatabaseId } from "@/lib/tour-editor";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const denied = await checkAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const departureId = Number(id);

  if (!isDatabaseId(departureId)) {
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

    const [stays, days] = await Promise.all([
      db.orm.public.HotelStay.where({ departureId })
        .include("hotel", (hotel) => hotel.select("name", "location", "phone")
          .include("rooms", (rooms) => rooms.count()))
        .include("roomAssignments", (assignments) => assignments.count())
        .include("roomAllotments", (allotments) => allotments.count())
        .all(),
      db.orm.public.Itinerary.where({ tourId: departure.tourId }).select("dayNumber")
        .include("destinations", (stops) => stops.select("id", "name")
          .orderBy([(stop) => stop.displayOrder.asc(), (stop) => stop.id.asc()]))
        .orderBy((day) => day.dayNumber.asc())
        .all(),
    ]);

    stays.sort((a, b) => {
      const aTime = a.checkInDate.epochNanoseconds;
      const bTime = b.checkInDate.epochNanoseconds;
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return a.id - b.id;
    });

    const enrichedStays = stays.map((stay) => {
      const { hotel } = stay;
      return {
        id: stay.id,
        departureId: stay.departureId,
        hotelId: stay.hotelId,
        destinationId: stay.destinationId,
        updatedAt: stay.updatedAt,
        checkInDay: localDepartureDay(stay.checkInDate).toString(),
        checkOutDay: localDepartureDay(stay.checkOutDate).toString(),
        checkInDate: stay.checkInDate.toString(),
        checkOutDate: stay.checkOutDate.toString(),
        hotelName: hotel?.name ?? "Unknown Hotel",
        hotelLocation: hotel?.location ?? "Unknown Location",
        hotelPhone: hotel?.phone ?? null,
        roomCount: hotel?.rooms ?? 0,
        assignmentCount: stay.roomAssignments,
        allotmentCount: stay.roomAllotments,
      };
    });

    const stops = days.flatMap((day) => day.destinations.map((stop) => ({ ...stop, dayNumber: day.dayNumber })));
    return Response.json(
      { success: true, stays: enrichedStays, stops },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET DEPARTURE HOTEL STAYS ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to load hotel stays." },
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

  if (!isDatabaseId(departureId)) {
    return badRequest("Invalid departure ID.");
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const input = parseStay(body);
  if (!input.stay) return badRequest(input.error);

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      if (!await lockDeparture(tx, departureId)) {
        return Response.json({ success: false, error: "Departure not found." }, { status: 404 });
      }
      const departure = await tx.orm.public.Departure.where({ id: departureId }).first();
      if (!departure) return Response.json({ success: false, error: "Departure not found." }, { status: 404 });

      const { hotelId, destinationId, ...dates } = input.stay;
      if (destinationId != null && !await stopBelongsToTour(tx, departure.tourId, destinationId)) {
        return badRequest("The selected itinerary stop does not belong to this tour.");
      }
      const hotel = await lockHotel(tx, hotelId);
      if (!hotel?.isActive) return badRequest("Selected hotel is inactive or does not exist.");

      const conflict = await stayDateConflict(tx, departure, hotelId, dates);
      if (conflict) return Response.json({ success: false, error: conflict }, { status: 409 });

      const stay = await tx.orm.public.HotelStay.create({ departureId, hotelId, destinationId: destinationId ?? null, ...dates });
      return Response.json({ success: true, stay }, { status: 201 });
    });
  } catch (error) {
    console.error("CREATE HOTEL STAY ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to schedule hotel stay." },
      { status: 500 }
    );
  }
}
