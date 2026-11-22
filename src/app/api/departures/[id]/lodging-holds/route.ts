import { checkAdminApi } from "@/lib/admin-auth";
import { checkoutLodgingSetupError } from "@/lib/booking-room-holds";
import { lockDeparture } from "@/lib/reservation-inventory";
import { lodgingHoldSchemaAvailable } from "@/lib/room-inventory";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

export async function PUT(request: Request, { params }: RouteContext<"/api/departures/[id]/lodging-holds">) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;
  const fail = (error: string, status: number) => Response.json({ error }, { status });
  const departureId = Number((await params).id);
  const body: unknown = await request.json().catch(() => null);
  if (!isDatabaseId(departureId) || !isRecord(body) || typeof body.enabled !== "boolean") {
    return fail("Enter valid lodging hold settings.", 400);
  }

  const enabled = body.enabled;
  try {
    const { db } = await import("@/prisma/db");
    return await db.transaction(async (tx) => {
      if (!await lodgingHoldSchemaAvailable(tx)) return fail("The lodging hold migration is pending.", 503);
      if (!await lockDeparture(tx, departureId)) return fail("Departure not found.", 404);
      if (enabled) {
        const error = await checkoutLodgingSetupError(tx, departureId);
        if (error) return fail(error, 409);
      }
      await tx.orm.public.DepartureLodgingSettings.upsert({
        conflictOn: { departureId },
        create: { departureId, holdsEnabled: enabled },
        update: { holdsEnabled: enabled },
      });
      return Response.json({ enabled });
    });
  } catch (error) {
    console.error("UPDATE LODGING HOLD SETTINGS ERROR:", error);
    return fail("Unable to save lodging hold settings.", 500);
  }
}
