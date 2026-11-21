import { checkAdminApi } from "@/lib/admin-auth";
import { updateDeparture } from "@/lib/departure-editor";
import { parseDepartureSchedule } from "@/lib/departure-schedule";
import { isDatabaseId, isRecord } from "@/lib/tour-editor";

export async function PATCH(request: Request, { params }: RouteContext<"/api/departures/[id]">) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;

  const id = Number((await params).id);
  const body: unknown = await request.json().catch(() => null);
  if (!isDatabaseId(id) || !isRecord(body) || typeof body.expectedUpdatedAt !== "string" ||
      typeof body.customerVisible !== "boolean" || typeof body.bookingOpen !== "boolean") {
    return Response.json({ error: "Enter valid departure settings." }, { status: 400 });
  }

  const parsed = body.schedule === undefined ? undefined : parseDepartureSchedule(body.schedule);
  if (parsed?.error) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await updateDeparture(id, {
      expectedUpdatedAt: body.expectedUpdatedAt,
      customerVisible: body.customerVisible,
      bookingOpen: body.bookingOpen,
      schedule: parsed?.schedule,
    });
    if (result.error !== undefined) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ departure: result.departure });
  } catch (error) {
    console.error("UPDATE DEPARTURE ERROR:", error);
    return Response.json({ error: "Could not save the departure." }, { status: 500 });
  }
}
