import { db } from "@/prisma/db";

type Props = {
    params: Promise<{ id: string }>;
};

export async function GET(
    _request: Request,
    { params }: Props
) {
    try {
        const { id } = await params;
        const departureId = Number(id);

        if (!Number.isInteger(departureId)) {
            return Response.json(
                {
                    success: false,
                    error: "Invalid departure ID.",
                },
                { status: 400 }
            );
        }

        const [pricingRecords, roomOptions] = await Promise.all([
            db.orm.public.DeparturePricing.all(),
            db.orm.public.DepartureRoomOption.all(),
        ]);

        const pricing = pricingRecords.find(
            (item) => item.departureId === departureId
        );

        return Response.json({
            success: true,
            pricing: pricing ?? null,
            roomOptions: roomOptions.filter(
                (room) => room.departureId === departureId
            ),
        });
    } catch (error) {
        console.error("GET DEPARTURE PRICING ERROR:", error);

        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: Props
) {
    try {
        const { id } = await params;
        const departureId = Number(id);

        if (!Number.isInteger(departureId)) {
            return Response.json(
                {
                    success: false,
                    error: "Invalid departure ID.",
                },
                { status: 400 }
            );
        }

        const body = await request.json();

        const adultFare = Number(body.adultFare);
        const childFeeEnabled = Boolean(body.childFeeEnabled);
        const childFare = childFeeEnabled
            ? Number(body.childFare)
            : 0;

        if (!Number.isFinite(adultFare) || adultFare < 0) {
            return Response.json(
                {
                    success: false,
                    error: "Adult fare must be a valid non-negative number.",
                },
                { status: 400 }
            );
        }

        if (!Number.isFinite(childFare) || childFare < 0) {
            return Response.json(
                {
                    success: false,
                    error: "Child fare must be a valid non-negative number.",
                },
                { status: 400 }
            );
        }

        const pricing =
            await db.orm.public.DeparturePricing.create({
                departureId,
                adultFare: String(adultFare),
                childFeeEnabled,
                childFare: String(childFare),
            });

        return Response.json(
            {
                success: true,
                pricing,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("CREATE DEPARTURE PRICING ERROR:", error);

        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error),
            },
            { status: 500 }
        );
    }
}