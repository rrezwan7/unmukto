import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import PricingForm from "./pricing-form";
import RoomOptionsForm from "./room-options-form";
import DepartureVehicles from "./departure-vehicles";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DepartureDetailsPage({ params }: Props) {
  await requireAdminPage();

  const { id } = await params;
  const departureId = Number(id);

  if (!Number.isSafeInteger(departureId) || departureId <= 0) {
    return <main className="p-6">Invalid departure ID.</main>;
  }

  const { db } = await import("@/prisma/db");

  const departure = await db.orm.public.Departure
    .where({ id: departureId })
    .first();

  if (!departure) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Departure not found</h1>
        <Link
          href="/admin/departures"
          className="mt-4 inline-block underline"
        >
          ← Back to Departures
        </Link>
      </main>
    );
  }

  const [tour, pricing] = await Promise.all([
    db.orm.public.Tour.where({ id: departure.tourId }).first(),
    db.orm.public.DeparturePricing.where({ departureId }).first(),
  ]);

  const details = [
    ["Tour", tour?.title ?? "Unknown Tour"],
    ["Departure Date", departure.departureDate.toString()],
    ["Departure Time", departure.departureTime ?? "-"],
    ["Return Date", departure.returnDate?.toString() ?? "-"],
    ["Return Time", departure.returnTime ?? "-"],
    ["Booking Open", departure.bookingOpen ? "Yes" : "No"],
  ];

  return (
    <main className="mx-auto max-w-5xl p-6">
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
        <p className="text-muted-foreground">Departure details</p>
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Departure Information
        </h2>

        <dl className="grid gap-4 md:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">
                {label}
              </dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <PricingForm
        key={departureId}
        departureId={departureId}
        initialPricing={
          pricing
            ? {
                adultFare: pricing.adultFare,
                childFare: pricing.childFare,
                childFeeEnabled: pricing.childFeeEnabled,
              }
            : null
        }
      />
<RoomOptionsForm key={`rooms-${departureId}`} departureId={departureId} />
<DepartureVehicles
  key={`vehicles-${departureId}`}
  departureId={departureId}
/>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Vehicles & Seats</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage vehicles and seat layouts.
          </p>
        </section>

        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Hotels</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage hotels and room assignments.
          </p>
        </section>
      </div>
    </main>
  );
}