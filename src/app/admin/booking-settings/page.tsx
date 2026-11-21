import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/admin-auth";
import { bookingSettingsId, guestBookingIsEnabled } from "@/lib/booking-settings";
import { db } from "@/prisma/db";
import { Button } from "@/components/ui/button";

async function saveSettings(form: FormData) {
  "use server";
  await requireAdminPage();

  const guestBookingEnabled = form.get("guestBookingEnabled") === "on";
  await db.orm.public.BookingSettings.upsert({
    conflictOn: { id: bookingSettingsId },
    create: { id: bookingSettingsId, guestBookingEnabled },
    update: { guestBookingEnabled },
  });
  revalidatePath("/admin/booking-settings");
}

export default async function BookingSettingsPage() {
  await requireAdminPage();
  const enabled = await guestBookingIsEnabled();

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-6 py-8">
      <h1 className="text-2xl font-semibold">Booking settings</h1>
      <form key={String(enabled)} action={saveSettings} className="max-w-lg space-y-4 rounded-lg border bg-card p-5">
        <label className="flex items-center gap-3 font-medium">
          <input name="guestBookingEnabled" type="checkbox" defaultChecked={enabled} className="size-4" />
          Allow guest booking
        </label>
        <p className="text-sm text-muted-foreground">
          When enabled, travelers can submit a reservation without an account. Pending reservations hold transport seats for up to 15 minutes.
        </p>
        <p className="text-sm text-muted-foreground" role="status">Guest booking is {enabled ? "enabled" : "disabled"}.</p>
        <Button type="submit">Save settings</Button>
      </form>
    </main>
  );
}
