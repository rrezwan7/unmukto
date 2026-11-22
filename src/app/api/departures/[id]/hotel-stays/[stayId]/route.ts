import { checkAdminApi } from "@/lib/admin-auth";
import { lockHotel, stayDateConflict, stopBelongsToTour } from "@/lib/accommodation-editor";
import { parseStay } from "@/lib/accommodation-input";
import { localDepartureDay } from "@/lib/departure-schedule";
import { lockDeparture, lockHotelStay } from "@/lib/reservation-inventory";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

type Props = {
  params: Promise<{ id: string; stayId: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const fail = (error: string, status = 400) => Response.json({ success: false, error }, { status });
  const { id, stayId: stayParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayParam);
  if (!isDatabaseId(departureId) || !isDatabaseId(stayId)) return fail("Invalid departure or stay ID.");

  const body: unknown = await request.json().catch(() => null);
  const input = parseStay(body);
  if (!input.stay) return fail(input.error);
  if (!isRecord(body) || typeof body.expectedUpdatedAt !== "string") {
    return fail("Reload the stay before editing.");
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      if (!await lockDeparture(tx, departureId)) return fail("Departure not found.", 404);
      if (!await lockHotelStay(tx, departureId, stayId)) return fail("Hotel stay not found on this departure.", 404);
      const { Departure, HotelStay, RoomAssignment, RoomAllotment } = tx.orm.public;
      const departure = await Departure.where({ id: departureId }).first();
      const current = await HotelStay.where({ id: stayId }).first();
      if (!departure || !current) return fail("Hotel stay not found on this departure.", 404);
      if (current.updatedAt !== body.expectedUpdatedAt) {
        return fail("This stay changed since you opened it. Reload before saving again.", 409);
      }

      const { hotelId, destinationId = current.destinationId } = input.stay;
      const hotelChanged = hotelId !== current.hotelId;
      const sameDay = (date: typeof current.checkInDate, other: typeof current.checkInDate) =>
        localDepartureDay(date).equals(localDepartureDay(other));
      const checkInChanged = !sameDay(input.stay.checkInDate, current.checkInDate);
      const checkOutChanged = !sameDay(input.stay.checkOutDate, current.checkOutDate);
      const dates = {
        checkInDate: checkInChanged ? input.stay.checkInDate : current.checkInDate,
        checkOutDate: checkOutChanged ? input.stay.checkOutDate : current.checkOutDate,
      };

      if (destinationId !== current.destinationId && destinationId !== null &&
          !await stopBelongsToTour(tx, departure.tourId, destinationId)) {
        return fail("The selected itinerary stop does not belong to this tour.");
      }
      if (hotelChanged || checkInChanged || checkOutChanged) {
        if (await RoomAssignment.where({ hotelStayId: stayId }).select("id").first()) {
          return fail("The hotel and dates are locked while this stay has room assignments.", 409);
        }
        if (await RoomAllotment.where({ hotelStayId: stayId }).select("id").first()) {
          return fail("Release this stay's room allotments before changing its hotel or dates.", 409);
        }
        if (hotelChanged && !(await lockHotel(tx, hotelId))?.isActive) {
          return fail("Selected hotel is inactive or does not exist.");
        }
        const conflict = await stayDateConflict(tx, departure, hotelId, dates, stayId);
        if (conflict) return fail(conflict, 409);
      }

      const stay = await HotelStay.where({ id: stayId }).update({ hotelId, destinationId, ...dates });
      return Response.json({ success: true, stay });
    });
  } catch (error) {
    console.error("UPDATE HOTEL STAY ERROR:", error);
    return fail("Unable to update hotel stay.", 500);
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const { id, stayId: stayIdParam } = await params;
  const departureId = Number(id);
  const stayId = Number(stayIdParam);

  const badRequest = (error: string) =>
    Response.json({ success: false, error }, { status: 400 });

  if (!isDatabaseId(departureId)) {
    return badRequest("Invalid departure ID.");
  }

  if (!isDatabaseId(stayId)) {
    return badRequest("Invalid stay ID.");
  }

  try {
    const { db } = await import("@/prisma/db");

    return await db.transaction(async (tx) => {
      if (!(await lockHotelStay(tx, departureId, stayId))) {
        return Response.json(
          { success: false, error: "Hotel stay not found on this departure." },
          { status: 404 }
        );
      }

      const assignments = await tx.orm.public.RoomAssignment
        .where({ hotelStayId: stayId })
        .select("id")
        .all();

      if (assignments.length > 0) {
        return Response.json(
          {
            success: false,
            error: `Cannot remove hotel stay while ${assignments.length} passenger room assignment(s) exist. Unassign passengers first.`,
          },
          { status: 409 }
        );
      }

      if (await tx.orm.public.RoomAllotment.where({ hotelStayId: stayId }).select("id").first()) {
        return Response.json(
          { success: false, error: "Release this stay's room allotments before removing it." },
          { status: 409 }
        );
      }
      await tx.orm.public.HotelStay.where({ id: stayId }).delete();
      return Response.json({ success: true });
    });
  } catch (error) {
    console.error("DELETE HOTEL STAY ERROR:", error);

    return Response.json(
      { success: false, error: "Unable to delete hotel stay." },
      { status: 500 }
    );
  }
}
