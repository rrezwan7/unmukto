import { checkAdminApi } from "@/lib/admin-auth";
import { Temporal } from "temporal-polyfill";

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
        const body = await request.json();

        const departure = await db.orm.public.Departure.create({
            tourId: Number(body.tourId),

            departureDate: Temporal.Instant.from(
                `${body.departureDate}T${body.departureTime || "00:00"}:00+06:00`
            ),

            returnDate: body.returnDate
                ? Temporal.Instant.from(
                    `${body.returnDate}T${body.returnTime || "00:00"}:00+06:00`
                )
                : null,

            departureTime: body.departureTime || null,
            returnTime: body.returnTime || null,
        });

        return Response.json(
            {
                success: true,
                departure,
            },
            { status: 201 }
        );
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