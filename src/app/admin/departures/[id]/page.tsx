import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import PricingForm from "./pricing-form";
import RoomOptionsForm from "./room-options-form";
import DepartureVehicles from "./departure-vehicles";
import DepartureHotelStays from "./departure-hotel-stays";
import GuestReservations from "./guest-reservations";
import { bookingIdIsValid } from "@/lib/departure-booking-quote";
import { departureHasHistory } from "@/lib/departure-editor";
import { scheduleFields } from "@/lib/departure-schedule";
import DepartureSettingsForm from "./departure-settings-form";
import LodgingHoldSettings from "./lodging-hold-settings";
import { checkoutLodgingSetting } from "@/lib/booking-room-holds";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guestStatus?: string | string[]; guestPage?: string | string[]; assignmentBooking?: string | string[] }>;
};

export default async function DepartureDetailsPage({ params, searchParams }: Props) {
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

  const [tour, pricing, hasHistory, lodging, { guestStatus, guestPage, assignmentBooking }] = await Promise.all([
    db.orm.public.Tour.where({ id: departure.tourId }).first(),
    db.orm.public.DeparturePricing.where({ departureId }).first(),
    departureHasHistory(departureId),
    checkoutLodgingSetting(departureId),
    searchParams,
  ]);
  const parsedBookingId = typeof assignmentBooking === "string" ? Number(assignmentBooking) : 0;
  const selectedBooking = bookingIdIsValid(parsedBookingId) ? await db.orm.public.Booking
    .where({ id: parsedBookingId, departureId, status: "CONFIRMED" })
    .select("id", "bookingNumber")
    .first() : null;

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

      <DepartureSettingsForm id={departureId} initialSchedule={scheduleFields(departure)} initialUpdatedAt={departure.updatedAt}
        initialVisible={departure.customerVisible} initialOpen={departure.bookingOpen} hasHistory={hasHistory} />

      {lodging.available && <LodgingHoldSettings key={`lodging-${departureId}`} departureId={departureId} initialEnabled={lodging.enabled} />}

      <GuestReservations lodgingAvailable={lodging.available} departureId={departureId} requestedStatus={guestStatus} requestedPage={guestPage} />

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
      <section id="departure-vehicles" aria-label="Departure vehicles" className="scroll-mt-4">
        {selectedBooking && (
          <p className="mt-6 text-sm">
            Assigning seats for {selectedBooking.bookingNumber}.{" "}
            <Link className="underline" href={`/admin/departures/${departureId}#departure-vehicles`}>Show all bookings</Link>
          </p>
        )}
        <DepartureVehicles key={`vehicles-${departureId}-${selectedBooking?.id ?? "all"}`}
          departureId={departureId} bookingId={selectedBooking?.id} />
      </section>
      <section id="departure-hotel-stays" aria-label="Departure hotel stays" className="scroll-mt-4">
        {selectedBooking && (
          <p className="mt-6 text-sm">
            Assigning rooms for {selectedBooking.bookingNumber}.{" "}
            <Link className="underline" href={`/admin/departures/${departureId}#departure-hotel-stays`}>Show all bookings</Link>
          </p>
        )}
        <DepartureHotelStays key={`hotel-stays-${departureId}-${selectedBooking?.id ?? "all"}`}
          departureId={departureId} bookingId={selectedBooking?.id} />
      </section>
    </main>
  );
}
