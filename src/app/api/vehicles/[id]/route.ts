import { checkAdminApi } from "@/lib/admin-auth";
import { transportEnd } from "@/lib/departure-schedule";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";
import { lockTransportConfiguration, lockTransportDepartures, seatCapacityConflict } from "@/lib/transport-editor";
import { duplicateRegistration, parseVehicle } from "@/lib/vehicle-input";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;
  const fail = (error: string, status = 400) => Response.json({ success: false, error }, { status });
  const id = Number((await params).id);
  if (!isDatabaseId(id)) return fail("Invalid vehicle ID.");

  const body: unknown = await request.json().catch(() => null);
  const input = parseVehicle(body);
  if (!input.vehicle) return fail(input.error);
  if (!isRecord(body) || typeof body.expectedUpdatedAt !== "string") {
    return fail("Reload the vehicle before editing.");
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      await lockTransportConfiguration(tx);
      const { Vehicle, Seat, SeatAssignment, Departure } = tx.orm.public;
      const current = await Vehicle.where({ id }).first();
      if (!current) return fail("Vehicle not found.", 404);
      if (current.updatedAt !== body.expectedUpdatedAt) {
        return fail("This vehicle changed since you opened it. Reload before saving again.", 409);
      }

      const { registrationNumber, isActive } = input.vehicle;
      if (registrationNumber && registrationNumber !== current.registrationNumber &&
          await Vehicle.where({ registrationNumber }).first()) {
        return fail(duplicateRegistration, 409);
      }

      if (current.isActive && !isActive) {
        const departures = await lockTransportDepartures(tx, { vehicleId: id });
        const seats = current.seatLayoutId === null ? [] : await Seat
          .where({ seatLayoutId: current.seatLayoutId, isAvailable: true }).select("id").all();

        for (const { departureId, visibleVehicles } of departures) {
          const departure = await Departure.where({ id: departureId }).first();
          if (departure && transportEnd(departure).epochMilliseconds > Date.now() &&
              await SeatAssignment.where({ departureId, vehicleId: id }).first()) {
            return fail(`Vehicle has passenger seat assignments on departure #${departureId}.`, 409);
          }
          const conflict = await seatCapacityConflict(tx, departureId, visibleVehicles * seats.length);
          if (conflict) return fail(conflict, 409);
        }
      }

      const vehicle = await Vehicle.where({ id }).update(input.vehicle);
      return Response.json({ success: true, vehicle });
    });
  } catch (error) {
    console.error("UPDATE VEHICLE ERROR:", error);
    return fail("Unable to update vehicle.", 500);
  }
}
