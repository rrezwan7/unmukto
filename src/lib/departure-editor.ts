import "server-only";
import { Temporal } from "temporal-polyfill";
import { db } from "@/prisma/db";
import { localDepartureDay, scheduleFields, transportEnd, type DepartureSchedule } from "@/lib/departure-schedule";
import { lockDeparture, transportSeatCapacity, type BookingTransaction } from "@/lib/reservation-inventory";

export async function departureHasHistory(departureId: number, tx?: BookingTransaction) {
  const plan = db.raw.sql`
    SELECT (
      EXISTS(SELECT 1 FROM "Booking" WHERE "departureId" = ${departureId}::int)
      OR EXISTS(SELECT 1 FROM "SeatAssignment" WHERE "departureId" = ${departureId}::int)
      OR EXISTS(
        SELECT 1 FROM "RoomAssignment" a JOIN "HotelStay" s ON s.id = a."hotelStayId"
        WHERE s."departureId" = ${departureId}::int
      )
    ) AS "hasHistory"
  `.returnsRow({ hasHistory: "pg/bool@1" }).build();
  const [row] = tx ? await tx.query(plan) : await db.runtime().query(plan);
  return row.hasHistory;
}

export async function lockVehicle(tx: BookingTransaction, vehicleId: number) {
  const rows = await tx.query(db.raw.sql`
    SELECT id FROM "Vehicle" WHERE id = ${vehicleId}::int FOR UPDATE
  `.returnsRow({ id: "pg/int4@1" }).build());
  return rows.length > 0;
}

export async function vehicleScheduleConflict(
  tx: BookingTransaction,
  departureId: number,
  vehicleId: number,
  schedule: DepartureSchedule,
) {
  const [conflict] = await tx.query(db.raw.sql`
    SELECT d.id
    FROM "DepartureVehicle" a
    JOIN "Departure" d ON d.id = a."departureId"
    WHERE a."vehicleId" = ${vehicleId}::int AND d.id <> ${departureId}::int
      AND d."departureDate" < ${transportEnd(schedule).toString()}::timestamptz
      AND greatest(
        d."departureDate" + interval '1 microsecond',
        CASE WHEN d."returnDate" IS NOT NULL AND d."returnTime" IS NOT NULL THEN d."returnDate"
          ELSE (((coalesce(d."returnDate", d."departureDate") AT TIME ZONE 'Asia/Dhaka')::date + 1)::timestamp AT TIME ZONE 'Asia/Dhaka')
        END
      ) > ${schedule.departureDate.toString()}::timestamptz
    ORDER BY d."departureDate"
    LIMIT 1
  `.returnsRow({ id: "pg/int4@1" }).build());
  return conflict;
}

export function stayOutsideSchedule(schedule: DepartureSchedule, stay: {
  checkInDate: Temporal.Instant;
  checkOutDate: Temporal.Instant;
}) {
  return Temporal.PlainDate.compare(localDepartureDay(stay.checkInDate), localDepartureDay(schedule.departureDate)) < 0 ||
    (schedule.returnDate !== null &&
      Temporal.PlainDate.compare(localDepartureDay(stay.checkOutDate), localDepartureDay(schedule.returnDate)) > 0);
}

function changedSchedule(current: DepartureSchedule, next: DepartureSchedule) {
  const before = scheduleFields(current);
  const after = scheduleFields(next);
  const departureChanged = before.departureDate !== after.departureDate || before.departureTime !== after.departureTime;
  const returnChanged = before.returnDate !== after.returnDate || before.returnTime !== after.returnTime;
  if (!departureChanged && !returnChanged) return undefined;
  return {
    departureDate: departureChanged ? next.departureDate : current.departureDate,
    departureTime: departureChanged ? next.departureTime : current.departureTime,
    returnDate: returnChanged ? next.returnDate : current.returnDate,
    returnTime: returnChanged ? next.returnTime : current.returnTime,
  };
}

export async function updateDeparture(id: number, input: {
  expectedUpdatedAt: string;
  customerVisible: boolean;
  bookingOpen: boolean;
  schedule?: DepartureSchedule;
}) {
  return db.transaction(async (tx) => {
    if (!(await lockDeparture(tx, id))) return { error: "Departure not found.", status: 404 } as const;
    const orm = tx.orm.public;
    const current = await orm.Departure.where({ id }).first();
    if (!current || current.updatedAt !== input.expectedUpdatedAt) {
      return { error: "This departure changed since you opened it. Reload before saving again.", status: 409 } as const;
    }

    const schedule = input.schedule && changedSchedule(current, input.schedule);
    if (schedule) {
      if (Temporal.Instant.compare(transportEnd(schedule), schedule.departureDate) <= 0) {
        return { error: "Return must be after departure.", status: 400 } as const;
      }
      if (await departureHasHistory(id, tx)) {
        return { error: "This departure has booking or assignment history. Its dates and times cannot be changed.", status: 409 } as const;
      }
      const stays = await orm.HotelStay.where({ departureId: id }).all();
      if (stays.some((stay) => stayOutsideSchedule(schedule, stay))) {
        return { error: "A scheduled hotel stay falls outside the new travel dates. Review the hotel stays first.", status: 409 } as const;
      }
      const vehicles = await orm.DepartureVehicle.where({ departureId: id })
        .select("vehicleId")
        .orderBy((allocation) => allocation.vehicleId.asc())
        .all();
      for (const { vehicleId } of vehicles) {
        await lockVehicle(tx, vehicleId);
        const conflict = await vehicleScheduleConflict(tx, id, vehicleId, schedule);
        if (conflict) {
          return { error: `Vehicle #${vehicleId} is already scheduled for departure #${conflict.id} during these dates.`, status: 409 } as const;
        }
      }
    }

    const opening = input.customerVisible && input.bookingOpen && (!current.customerVisible || !current.bookingOpen);
    if (input.customerVisible && input.bookingOpen && (schedule || opening) &&
        Temporal.Instant.compare((schedule ?? current).departureDate, Temporal.Now.instant()) <= 0) {
      return { error: "Booking can only open for a future departure.", status: 409 } as const;
    }
    if (opening) {
      const [tour, pricing, room, capacity] = await Promise.all([
        orm.Tour.where({ id: current.tourId, isActive: true }).select("id").first(),
        orm.DeparturePricing.where({ departureId: id }).select("id").first(),
        orm.DepartureRoomOption.where({ departureId: id, isAvailable: true }).select("id").first(),
        transportSeatCapacity(id, tx),
      ]);
      if (!tour || !pricing || !room || capacity === 0) {
        return { error: "To open bookings, publish the tour and set pricing, an available room option, and a customer-visible vehicle with enabled seats.", status: 409 } as const;
      }
    }

    const departure = await orm.Departure.where({ id }).update({
      ...schedule,
      customerVisible: input.customerVisible,
      bookingOpen: input.bookingOpen,
    });
    return { departure };
  });
}
