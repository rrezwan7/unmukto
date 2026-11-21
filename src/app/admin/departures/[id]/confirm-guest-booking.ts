"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin-auth";
import { bookingIdIsValid } from "@/lib/departure-booking-quote";
import { confirmGuestBookingManually, type ManualConfirmation } from "@/lib/manual-booking-confirmation";

export async function confirmGuestBooking(
  departureId: number,
  bookingId: number,
  _previous: ManualConfirmation | null,
  form: FormData,
): Promise<ManualConfirmation> {
  const session = await requireAdminPage();
  if (!session.adminGithubId || !bookingIdIsValid(departureId) || !bookingIdIsValid(bookingId)) {
    return { error: "Unable to verify the booking or admin account." };
  }

  const result = await confirmGuestBookingManually({ departureId, bookingId, adminGithubId: session.adminGithubId, form });
  if ("confirmed" in result) revalidatePath(`/admin/departures/${departureId}`);
  return result;
}
