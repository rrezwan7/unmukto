import "server-only";
import { db } from "@/prisma/db";
import type { BookingTransaction } from "@/lib/reservation-inventory";

export const bookingSettingsId = 1;

export async function guestBookingIsEnabled(tx?: BookingTransaction) {
  if (tx) {
    const rows = await tx.query(db.raw.sql`
      SELECT "guestBookingEnabled" FROM "BookingSettings"
      WHERE id = ${bookingSettingsId}::int
      FOR SHARE
    `.returnsRow({ guestBookingEnabled: "pg/bool@1" }).build());
    return rows[0]?.guestBookingEnabled === true;
  }

  const settings = await db.orm.public.BookingSettings.where({ id: bookingSettingsId }).first();
  return settings?.guestBookingEnabled === true;
}
