import Link from "next/link";
import { db } from "@/prisma/db";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function DepartureDetailsPage({ params }: Props) {
    const { id } = await params;

    const departureId = Number(id);

    const [departures, tours] = await Promise.all([
        db.orm.public.Departure.all(),
        db.orm.public.Tour.all(),
    ]);

    const departure = departures.find((item) => item.id === departureId);

    if (!departure) {
        return (
            <main className="p-6">
                <h1 className="text-2xl font-bold">Departure not found</h1>

                <Link
                    href="/admin/departures"
                    className="mt-4 inline-block text-primary underline"
                >
                    ← Back to Departures
                </Link>
            </main>
        );
    }

    const tour = tours.find((item) => item.id === departure.tourId);

    return (
        <main className="p-6">
            <div className="mb-6">
                <Link
                    href="/admin/departures"
                    className="text-sm text-muted-foreground hover:underline"
                >
                    ← Back to Departures
                </Link>

                <h1 className="mt-3 text-2xl font-bold">
                    {tour?.title ?? "Unknown Tour"}
                </h1>

                <p className="text-muted-foreground">
                    Departure details
                </p>
            </div>

            <div className="rounded-lg border p-6">
                <h2 className="mb-4 text-lg font-semibold">
                    Departure Information
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Tour</p>
                        <p className="font-medium">
                            {tour?.title ?? "Unknown Tour"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Departure Date</p>
                        <p className="font-medium">
                            {departure.departureDate.toString()}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Departure Time</p>
                        <p className="font-medium">
                            {departure.departureTime ?? "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Return Date</p>
                        <p className="font-medium">
                            {departure.returnDate?.toString() ?? "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Return Time</p>
                        <p className="font-medium">
                            {departure.returnTime ?? "-"}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Booking Open</p>
                        <p className="font-medium">
                            {departure.bookingOpen ? "Yes" : "No"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-5">
                    <h2 className="font-semibold">Pricing</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage passenger and room prices.
                    </p>
                </div>

                <div className="rounded-lg border p-5">
                    <h2 className="font-semibold">Vehicles & Seats</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage vehicles and seat layouts.
                    </p>
                </div>

                <div className="rounded-lg border p-5">
                    <h2 className="font-semibold">Hotels</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage hotels and room assignments.
                    </p>
                </div>
            </div>
        </main>
    );
}