import { checkAdminApi } from "@/lib/admin-auth";
import { parseDepartureSchedule } from "@/lib/departure-schedule";
import { isDatabaseId, isRecord, lockTour } from "@/lib/tour-editor";

export async function GET() {
    const denied = await checkAdminApi();
    if (denied) return denied;
    const { db } = await import("@/prisma/db");
    const departures = await db.orm.public.Departure.all();

    return Response.json({
        success: true,
        departures,
    });
}

export async function POST(request: Request) {
    const denied = await checkAdminApi(request);
    if (denied) return denied;
    const { db } = await import("@/prisma/db");
    try {
        const body: unknown = await request.json().catch(() => null);
        if (!isRecord(body)) return Response.json({ success: false, error: "Enter valid departure details." }, { status: 400 });

        const tourId = Number(body.tourId);
        if (!isDatabaseId(tourId)) {
            return Response.json({ success: false, error: "Choose a valid tour." }, { status: 400 });
        }
        const parsed = parseDepartureSchedule(body);
        if (parsed.error) {
            return Response.json({ success: false, error: parsed.error }, { status: 400 });
        }
        return await db.transaction(async (tx) => {
            const tour = await lockTour(tx, tourId);
            if (!tour?.isActive) {
                return Response.json({ success: false, error: "Choose a published tour." }, { status: 409 });
            }
            const departure = await tx.orm.public.Departure.create({ tourId, ...parsed.schedule });

            return Response.json({ success: true, departure }, { status: 201 });
        });
    } catch (error) {
        console.error("CREATE DEPARTURE ERROR:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
