import { checkAdminApi } from "@/lib/admin-auth";
import { lockDeparture } from "@/lib/reservation-inventory";
import { isDatabaseId } from "@/lib/tour-editor";
import { lockTransportConfiguration, seatCapacityConflict } from "@/lib/transport-editor";

type Props = { params: Promise<{ id: string; vehicleId: string }> };

export async function DELETE(request: Request, { params }: Props) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const fail = (error: string, status: number) => Response.json({ success: false, error }, { status });
  const { id, vehicleId: vehicleParam } = await params;
  const departureId = Number(id);
  const vehicleId = Number(vehicleParam);
  if (!isDatabaseId(departureId) || !isDatabaseId(vehicleId)) {
    return fail("Invalid departure or vehicle ID.", 400);
  }

  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      await lockTransportConfiguration(tx);
      if (!await lockDeparture(tx, departureId)) return fail("Departure not found.", 404);

      const { DepartureVehicle, SeatAssignment, Vehicle, Seat } = tx.orm.public;
      const allocation = await DepartureVehicle.where({ departureId, vehicleId }).first();
      if (!allocation) return Response.json({ success: true });

      if (await SeatAssignment.where({ departureId, vehicleId }).first()) {
        return fail("This vehicle has passenger seat assignments on this departure.", 409);
      }

      const vehicle = await Vehicle.where({ id: vehicleId }).first();
      if (allocation.visibleToCustomer && vehicle?.isActive && vehicle.seatLayoutId !== null) {
        const seats = await Seat.where({
          seatLayoutId: vehicle.seatLayoutId, isAvailable: true,
        }).select("id").all();
        const conflict = await seatCapacityConflict(tx, departureId, seats.length);
        if (conflict) return fail(conflict, 409);
      }

      await DepartureVehicle.where({ id: allocation.id }).delete();
      return Response.json({ success: true });
    });
  } catch (error) {
    console.error("REMOVE DEPARTURE VEHICLE ERROR:", error);
    return fail("Unable to remove vehicle from this departure.", 500);
  }
}
