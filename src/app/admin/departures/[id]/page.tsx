import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { getActiveGuestHolds } from "@/lib/reservation-inventory";
import PricingForm from "./pricing-form";
import RoomOptionsForm from "./room-options-form";
import DepartureVehicles from "./departure-vehicles";
import DepartureHotelStays from "./departure-hotel-stays";

type Props = {
  params: Promise<{ id: string }>;
};

const holdDeadlineFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});

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

  const [tour, pricing, guestHolds] = await Promise.all([
    db.orm.public.Tour.where({ id: departure.tourId }).first(),
    db.orm.public.DeparturePricing.where({ departureId }).first(),
    getActiveGuestHolds(departureId),
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

      <section className="my-6 rounded-lg border p-6" aria-labelledby="guest-holds">
        <h2 id="guest-holds" className="text-lg font-semibold">Pending guest reservations</h2>
        {guestHolds.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">There are no active guest reservations for this departure.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {guestHolds.map((booking) => (
              <li key={booking.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{booking.bookingNumber}</p>
                  <p>{booking.guestContactName} · {booking.guestContactPhone}</p>
                  {booking.guestContactEmail && <p>{booking.guestContactEmail}</p>}
                </div>
                <div>
                  <p>৳{booking.totalAmount}</p>
                  <p className="text-muted-foreground">
                    Hold ends {holdDeadlineFormat.format(booking.expiresAt)} (Bangladesh time)
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
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
      <DepartureHotelStays
        key={`hotel-stays-${departureId}`}
        departureId={departureId}
      />
    </main>
  );
}
