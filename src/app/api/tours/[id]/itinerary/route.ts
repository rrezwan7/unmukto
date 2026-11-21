import { checkAdminApi } from "@/lib/admin-auth";
import { isDatabaseId, isRecord, parseItineraryDays, saveTourItinerary } from "@/lib/tour-editor";

export async function PUT(request: Request, { params }: RouteContext<"/api/tours/[id]/itinerary">) {
  const denied = await checkAdminApi(request);
  if (denied) return denied;
  const tourId = Number((await params).id);
  const payload: unknown = await request.json().catch(() => null);
  if (!isDatabaseId(tourId) || !isRecord(payload) ||
      typeof payload.version !== "string" || !/^[a-f0-9]{64}$/.test(payload.version)) {
    return Response.json({ error: "Valid itinerary details are required." }, { status: 400 });
  }

  const days = parseItineraryDays(payload.days);
  if (!days) return Response.json({ error: "Enter a title for every day and a name for every stop." }, { status: 400 });

  try {
    const result = await saveTourItinerary(tourId, payload.version, days);
    if (result.error !== undefined) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ itinerary: result.itinerary });
  } catch (error) {
    if (error instanceof Error && error.message.includes("HotelStay_destinationId_fkey")) {
      return Response.json({ error: "A stop is linked to a hotel stay. Update the stay before removing that stop." }, { status: 409 });
    }
    console.error("UPDATE TOUR ITINERARY ERROR:", error);
    return Response.json({ error: "Could not save the itinerary." }, { status: 500 });
  }
}
