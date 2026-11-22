"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin-auth";
import { bookingIdIsValid } from "@/lib/departure-booking-quote";
import { releaseUnpaidReservation, type ReservationReleaseResult } from "@/lib/reservation-release";

export async function releaseReservation(
  departureId: number,
  bookingId: number,
  _previous: ReservationReleaseResult | null,
  form: FormData,
): Promise<ReservationReleaseResult> {
  const session = await requireAdminPage();
  if (!session.adminGithubId || !bookingIdIsValid(departureId) || !bookingIdIsValid(bookingId)) {
    return { error: "Unable to verify the booking or admin account." };
  }
  if (form.get("unpaidVerified") !== "on") {
    return { error: "Verify that no payment was received before releasing the hold." };
  }

  const result = await releaseUnpaidReservation({
    departureId, bookingId, adminGithubId: session.adminGithubId, reason: form.get("reason"),
  });
  if ("released" in result) revalidatePath(`/admin/departures/${departureId}`);
  return result;
}
