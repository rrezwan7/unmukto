import Link from "next/link";
import { Temporal } from "temporal-polyfill";
import { db } from "@/prisma/db";
import { localDepartureDay } from "@/lib/departure-schedule";
import { passengerNeedsSeat } from "@/lib/reservation-inventory";
import { confirmGuestBooking } from "./confirm-guest-booking";
import ManualConfirmationForm from "./manual-confirmation-form";

const filters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const pageSize = 25;
const deadlineFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});
const roomLabels = { SHARED: "Shared", COUPLE: "Couple", PRIVATE: "Private" };
const passengerLabels = { ADULT: "Adult", CHILD: "Child", INFANT: "Infant" };

async function loadReservations(departureId: number, filter: string, page: number) {
  const now = Temporal.Now.instant();
  let query = db.orm.public.Booking.where({ departureId })
    .where((booking) => booking.customerId.isNull())
    .where((booking) => booking.reservationKey.isNotNull());

  switch (filter) {
    case "pending":
      query = query.where({ status: "PENDING" }).where((booking) => booking.holdExpiresAt.gt(now));
      break;
    case "expired":
      query = query.where({ status: "PENDING" }).where((booking) => booking.holdExpiresAt.lte(now));
      break;
    case "confirmed":
      query = query.where({ status: "CONFIRMED" });
      break;
    case "cancelled":
      query = query.where({ status: "CANCELLED" });
      break;
  }

  const bookings = await query
    .select("id", "bookingNumber", "status", "guestContactName", "guestContactPhone",
      "guestContactEmail", "totalAmount", "paidAmount", "holdExpiresAt", "confirmedAt", "confirmedByGithubId",
      "childFeeEnabledAtBooking", "roomOptionId")
    .include("roomOption", (room) => room.select("roomType"))
    .include("passengers", (passengers) => passengers.select("id", "name", "passengerType")
      .include("seatAssignment", (assignment) => assignment.select("departureId"))
      .include("roomAssignments", (assignments) => assignments.select("hotelStayId"))
      .orderBy((passenger) => passenger.id.asc()))
    .orderBy((booking) => booking.id.desc())
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize)
    .all();

  const currentPage = bookings.slice(0, pageSize);
  const scheduledStays = currentPage.some((booking) => booking.status === "CONFIRMED" && booking.roomOptionId !== null)
    ? await db.orm.public.HotelStay.where({ departureId }).select("id", "checkInDate", "checkOutDate")
      .include("hotel", (hotel) => hotel.select("name"))
      .orderBy([(stay) => stay.checkInDate.asc(), (stay) => stay.id.asc()]).all()
    : [];
  const stays = scheduledStays.map((stay) => ({
    id: stay.id,
    hotel: stay.hotel?.name ?? "Hotel stay",
    checkIn: localDepartureDay(stay.checkInDate).toString(),
    checkOut: localDepartureDay(stay.checkOutDate).toString(),
  }));

  return {
    hasNextPage: bookings.length > pageSize,
    bookings: currentPage.map((booking) => {
      const expired = booking.status === "PENDING" && booking.holdExpiresAt !== null &&
        Temporal.Instant.compare(booking.holdExpiresAt, now) <= 0;
      return {
        ...booking,
        reviewStatus: expired ? "EXPIRED" : booking.status,
        progress: booking.status === "CONFIRMED" ? assignmentProgress(booking, stays, departureId) : null,
      };
    }),
  };
}

type ReservationPassenger = {
  passengerType: string;
  seatAssignment: { departureId: number } | null;
  roomAssignments: { hotelStayId: number }[];
};

type ReservationStay = {
  id: number;
  hotel: string;
  checkIn: string;
  checkOut: string;
};

function assignmentProgress(booking: {
  childFeeEnabledAtBooking: boolean;
  roomOptionId: number | null;
  passengers: ReservationPassenger[];
}, stays: ReservationStay[], departureId: number) {
  const seatPassengers = booking.passengers.filter((passenger) =>
    passengerNeedsSeat(passenger.passengerType, booking.childFeeEnabledAtBooking));
  const assignedSeats = seatPassengers.filter((passenger) => passenger.seatAssignment?.departureId === departureId).length;

  if (booking.roomOptionId === null) {
    return { assignedSeats, requiredSeats: seatPassengers.length, roomProgress: null };
  }

  const roomAssignments = new Map<number, number>();
  for (const passenger of booking.passengers) {
    for (const { hotelStayId } of passenger.roomAssignments) {
      roomAssignments.set(hotelStayId, (roomAssignments.get(hotelStayId) ?? 0) + 1);
    }
  }

  return {
    assignedSeats,
    requiredSeats: seatPassengers.length,
    roomProgress: {
      passengers: booking.passengers.length,
      stays: stays.map((stay) => ({
        ...stay,
        assigned: roomAssignments.get(stay.id) ?? 0,
      })),
    },
  };
}

type AssignmentProgress = ReturnType<typeof assignmentProgress>;

function AssignmentSummary({ progress }: { progress: AssignmentProgress }) {
  const { assignedSeats, requiredSeats, roomProgress } = progress;
  const completed = roomProgress?.stays.filter((stay) => stay.assigned === roomProgress.passengers).length;
  const rooms = roomProgress ? "No hotel stays scheduled" : "No room requested";

  return (
    <span className="ml-2 inline-flex flex-wrap gap-x-3 text-xs font-normal text-muted-foreground">
      <span>{requiredSeats ? `Bus seats ${assignedSeats} of ${requiredSeats}` : "No bus seats required"}</span>
      <span>{roomProgress?.stays.length ? `Hotel stays ${completed} of ${roomProgress.stays.length} complete` : rooms}</span>
    </span>
  );
}

function RoomAssignmentsByStay({ progress }: { progress: AssignmentProgress["roomProgress"] }) {
  if (!progress?.stays.length) return null;
  return (
    <div>
      <h3 className="font-medium">Room assignments by stay</h3>
      <ul className="mt-1 grid gap-1">
        {progress.stays.map((stay) => (
          <li key={stay.id}>
            {stay.hotel} <span className="text-muted-foreground">· {stay.checkIn} to {stay.checkOut}</span>
            <span> · {stay.assigned} of {progress.passengers} passengers assigned</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function GuestReservations({
  departureId,
  requestedStatus,
  requestedPage,
}: {
  departureId: number;
  requestedStatus?: string | string[];
  requestedPage?: string | string[];
}) {
  const status = filters.find(({ value }) => value === requestedStatus)?.value ?? "all";
  const pageNumber = typeof requestedPage === "string" ? Number(requestedPage) : 1;
  const page = Number.isSafeInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 1_000_000
    ? pageNumber : 1;
  const { bookings, hasNextPage } = await loadReservations(departureId, status, page);
  const href = (filter: typeof status, pageNumber = 1) =>
    `/admin/departures/${departureId}?guestStatus=${filter}&guestPage=${pageNumber}#guest-reservations`;
  const assignmentHref = (bookingId: number, section: string) =>
    `/admin/departures/${departureId}?guestStatus=${status}&guestPage=${page}&assignmentBooking=${bookingId}#${section}`;

  return (
    <section id="guest-reservations" className="my-6 scroll-mt-4 rounded-lg border p-6" aria-labelledby="guest-reservations-heading">
      <h2 id="guest-reservations-heading" className="text-lg font-semibold">Guest reservations</h2>
      <nav aria-label="Filter guest reservations" className="mt-3 flex flex-wrap gap-1.5">
        {filters.map(({ value, label }) => (
          <Link
            key={value}
            href={href(value)}
            aria-current={status === value ? "page" : undefined}
            className={`rounded-md border px-2.5 py-1.5 text-sm ${status === value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No guest reservations in this view.</p>
      ) : (
        <ul className="mt-4 divide-y">
          {bookings.map((booking) => (
            <li key={booking.id} className="py-3 text-sm">
              <details>
                <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-ring">
                  {booking.bookingNumber} <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{booking.reviewStatus}</span>
                  {booking.progress && <AssignmentSummary progress={booking.progress} />}
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <dl className="grid gap-2">
                    <div>
                      <dt className="text-muted-foreground">Contact</dt>
                      <dd>{booking.guestContactName}</dd>
                      <dd>{booking.guestContactPhone}</dd>
                      {booking.guestContactEmail && <dd className="wrap-anywhere">{booking.guestContactEmail}</dd>}
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Requested room</dt>
                      <dd>{booking.roomOption ? roomLabels[booking.roomOption.roomType] : "None recorded"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Quoted total / paid</dt>
                      <dd>৳{booking.totalAmount} / ৳{booking.paidAmount}</dd>
                    </div>
                    {booking.reviewStatus !== "CONFIRMED" && booking.holdExpiresAt && (
                      <div>
                        <dt className="text-muted-foreground">Hold deadline (Bangladesh time)</dt>
                        <dd><time dateTime={booking.holdExpiresAt.toString()}>{deadlineFormat.format(booking.holdExpiresAt.epochMilliseconds)}</time></dd>
                      </div>
                    )}
                    {booking.confirmedAt && (
                      <div>
                        <dt className="text-muted-foreground">Manually confirmed (Bangladesh time)</dt>
                        <dd><time dateTime={booking.confirmedAt.toString()}>{deadlineFormat.format(booking.confirmedAt.epochMilliseconds)}</time></dd>
                        {booking.confirmedByGithubId && <dd>GitHub admin ID {booking.confirmedByGithubId}</dd>}
                      </div>
                    )}
                  </dl>
                  <div>
                    <h3 className="font-medium">Passengers ({booking.passengers.length})</h3>
                    <ul className="mt-1 grid gap-1">
                      {booking.passengers.map((passenger) => (
                        <li className="wrap-anywhere" key={passenger.id}>
                          {passenger.name} <span className="text-muted-foreground">· {passengerLabels[passenger.passengerType]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {booking.reviewStatus === "PENDING" && booking.holdExpiresAt && (
                  <ManualConfirmationForm
                    confirm={confirmGuestBooking.bind(null, departureId, booking.id)}
                    total={booking.totalAmount}
                    hasRoomRequest={booking.roomOption !== null}
                  />
                )}
                {booking.progress && (
                  <div className="mt-4 space-y-3">
                    <RoomAssignmentsByStay progress={booking.progress.roomProgress} />
                    <div className="flex flex-wrap gap-4">
                      <Link className="underline" href={assignmentHref(booking.id, "departure-vehicles")}>Assign bus seats</Link>
                      <Link className="underline" href={assignmentHref(booking.id, "departure-hotel-stays")}>Assign hotel rooms</Link>
                    </div>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasNextPage) && (
        <nav className="mt-3 flex flex-wrap items-center gap-4 text-sm" aria-label="Guest reservation pages">
          {page > 1 && <Link className="underline" href={href(status, page - 1)}>Previous</Link>}
          <span>Page {page}</span>
          {hasNextPage && page < 1_000_000 && <Link className="underline" href={href(status, page + 1)}>Next</Link>}
        </nav>
      )}
    </section>
  );
}
