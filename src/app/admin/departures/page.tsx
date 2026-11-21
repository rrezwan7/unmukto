import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { scheduleFields } from "@/lib/departure-schedule";

export default async function DeparturesPage() {
    await requireAdminPage();
    const { db } = await import("@/prisma/db");
    const [departures, tours] = await Promise.all([
        db.orm.public.Departure.all(),
        db.orm.public.Tour.all(),
    ]);

    const tourMap = new Map(
        tours.map((tour) => [tour.id, tour.title])
    );

    return (
        <main className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Departures</h1>
                    <p className="text-muted-foreground">
                        Manage scheduled tour departures.
                    </p>
                </div>

                <Link
                    href="/admin/departures/new"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                    + Create Departure
                </Link>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left">Tour</th>
                            <th className="px-4 py-3 text-left">Departure</th>
                            <th className="px-4 py-3 text-left">Return</th>
                            <th className="px-4 py-3 text-left">Departure Time</th>
                            <th className="px-4 py-3 text-left">Return Time</th>
                            <th className="px-4 py-3 text-left">Customer status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {departures.map((departure) => {
                            const schedule = scheduleFields(departure);
                            const status = departure.customerVisible
                                ? departure.bookingOpen ? "Booking open" : "Booking closed"
                                : "Hidden";
                            return (
                                <tr key={departure.id} className="border-b hover:bg-muted/50">
                                    <td className="px-4 py-3">
                                        <Link href={`/admin/departures/${departure.id}`} className="font-medium hover:underline">
                                            {tourMap.get(departure.tourId) ?? "Unknown Tour"}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">{schedule.departureDate}</td>
                                    <td className="px-4 py-3">{schedule.returnDate || "—"}</td>
                                    <td className="px-4 py-3">{schedule.departureTime || "—"}</td>
                                    <td className="px-4 py-3">{schedule.returnTime || "—"}</td>
                                    <td className="px-4 py-3">{status}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
