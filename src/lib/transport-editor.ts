import "server-only";
import { db } from "@/prisma/db";
import { transportEnd } from "@/lib/departure-schedule";
import {
  committedSeatCounts,
  lockDeparture,
  transportSeatCapacity,
  type BookingTransaction,
} from "@/lib/reservation-inventory";

// Take this before departure and vehicle locks. It keeps the set of affected
// departures stable while a vehicle or a shared layout is being edited.
export async function lockTransportConfiguration(tx: BookingTransaction) {
  await tx.query(db.raw.sql`
    SELECT 1 AS locked FROM pg_advisory_xact_lock(184306, 1)
  `.returnsRow({ locked: "pg/int4@1" }).build());
}

export async function lockTransportDepartures(
  tx: BookingTransaction,
  target: { vehicleId: number } | { layoutId: number },
) {
  const vehicleId = "vehicleId" in target ? target.vehicleId : 0;
  const layoutId = "layoutId" in target ? target.layoutId : 0;
  const departures = await tx.query(db.raw.sql`
    SELECT a."departureId", count(*) FILTER (
      WHERE a."visibleToCustomer" AND v."isActive"
    )::int AS "visibleVehicles"
    FROM "DepartureVehicle" a
    JOIN "Vehicle" v ON v.id = a."vehicleId"
    WHERE v.id = ${vehicleId}::int OR v."seatLayoutId" = ${layoutId}::int
    GROUP BY a."departureId"
    ORDER BY a."departureId"
  `.returnsRow({ departureId: "pg/int4@1", visibleVehicles: "pg/int4@1" }).build());

  for (const { departureId } of departures) await lockDeparture(tx, departureId);
  return departures;
}

export async function seatCapacityConflict(
  tx: BookingTransaction,
  departureId: number,
  seatsLost: number,
) {
  if (seatsLost <= 0) return;
  const departure = await tx.orm.public.Departure.where({ id: departureId }).first();
  if (!departure) return;
  const now = Date.now();
  if (transportEnd(departure).epochMilliseconds <= now) return;

  const before = await transportSeatCapacity(departureId, tx);
  const after = before - seatsLost;
  const committed = await committedSeatCounts(departureId, tx);
  if (after < (committed.get(departureId) ?? 0)) {
    return `Departure #${departureId} would have too few seats for existing bookings and holds.`;
  }
  if (after === 0 && departure.bookingOpen && departure.customerVisible &&
      departure.departureDate.epochMilliseconds > now) {
    return `Departure #${departureId} is open for booking and needs a customer-visible vehicle with enabled seats. Close booking or add seats first.`;
  }
}
