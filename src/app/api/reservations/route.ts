import { createHash, randomBytes } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { isSameOrigin } from "@/lib/auth-policy";
import { guestBookingIsEnabled } from "@/lib/booking-settings";
import { bookingIdIsValid, getDepartureBookingQuote } from "@/lib/departure-booking-quote";
import { db } from "@/prisma/db";

const holdMinutes = 15;
const maxTravelers = 20;
const passengerTypes = ["ADULT", "CHILD", "INFANT"] as const;
type PassengerType = typeof passengerTypes[number];

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

function textValue(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function parsePassenger(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const { type, name } = value as Record<string, unknown>;
  const passengerType = passengerTypes.find((allowed) => type === allowed);
  const passengerName = textValue(name, 100);
  return passengerType && passengerName ? { passengerType, name: passengerName } : null;
}

function validKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("এই পেজ থেকে আবার চেষ্টা করুন।", 403);
  const input: unknown = await request.json().catch(() => null);
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("বুকিংয়ের তথ্য দিন।", 400);
  }

  const { departureId, roomOptionId, reservationKey, quoteVersion, contactName, contactPhone, contactEmail, passengers } =
    input as Record<string, unknown>;
  if (
    !bookingIdIsValid(departureId) || !bookingIdIsValid(roomOptionId) ||
    !validKey(reservationKey) || typeof quoteVersion !== "string" || !/^[a-f0-9]{64}$/.test(quoteVersion) ||
    !Array.isArray(passengers) || passengers.length === 0 || passengers.length > maxTravelers
  ) {
    return fail("যাত্রী, রুম ও ভাড়ার হিসাব যাচাই করে আবার চেষ্টা করুন। এক বুকিংয়ে সর্বোচ্চ ২০ জন যাত্রী যোগ করা যাবে।", 400);
  }

  const name = textValue(contactName, 100);
  const phone = textValue(contactPhone, 30)?.replace(/[ ()-]/g, "");
  const email = textValue(contactEmail, 254)?.toLowerCase() ?? null;
  if (!name || !phone || !/^\+?\d{7,15}$/.test(phone) ||
      (contactEmail !== "" && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))) {
    return fail("যোগাযোগের নাম, সঠিক ফোন নম্বর ও প্রযোজ্য হলে ইমেইল দিন।", 400);
  }

  const travelers: { passengerType: PassengerType; name: string }[] = [];
  const counts = { adults: 0, children: 0, infants: 0 };
  for (const passenger of passengers) {
    const traveler = parsePassenger(passenger);
    if (!traveler) return fail("প্রত্যেক যাত্রীর নাম দিন।", 400);
    travelers.push(traveler);
    if (traveler.passengerType === "ADULT") counts.adults++;
    if (traveler.passengerType === "CHILD") counts.children++;
    if (traveler.passengerType === "INFANT") counts.infants++;
  }
  if (!counts.adults) return fail("কমপক্ষে একজন প্রাপ্তবয়স্ক যাত্রী যোগ করুন।", 400);

  const fingerprint = createHash("sha256").update(JSON.stringify([
    departureId, roomOptionId, quoteVersion, name, phone, email, travelers,
  ])).digest("hex");

  try {
    return await db.transaction(async (tx) => {
      // Serialize availability checks and inserts for the same departure.
      const locked = await tx.query(db.raw.sql`
        SELECT id FROM "Departure" WHERE id = ${departureId}::int FOR UPDATE
      `.returnsRow({ id: "pg/int4@1" }).build());
      if (!locked.length) return fail("এই যাত্রাটি পাওয়া যায়নি।", 404);

      const existing = await tx.orm.public.Booking.where({ reservationKey }).first();
      if (existing) {
        if (existing.reservationFingerprint !== fingerprint) {
          return fail("বুকিংয়ের তথ্য পরিবর্তন হয়েছে। নতুন করে ভাড়ার হিসাব দেখুন।", 409);
        }
        if (existing.status !== "PENDING" || !existing.holdExpiresAt ||
            existing.holdExpiresAt.epochMilliseconds <= Date.now()) {
          return fail("এই আসন সংরক্ষণের মেয়াদ শেষ হয়েছে। নতুন করে ভাড়া হিসাব করুন।", 409);
        }
        return Response.json({ bookingNumber: existing.bookingNumber, holdExpiresAt: existing.holdExpiresAt.toString() });
      }

      if (!(await guestBookingIsEnabled(tx))) {
        return fail("এই মুহূর্তে অতিথি হিসেবে বুকিং বন্ধ আছে।", 403);
      }

      const result = await getDepartureBookingQuote(departureId, roomOptionId, counts, tx);
      if (result.error !== undefined) return fail(result.error, result.status);
      if (quoteVersion !== result.quoteVersion) {
        return fail("ভাড়া পরিবর্তন হয়েছে। নতুন হিসাব দেখে আবার চেষ্টা করুন।", 409);
      }

      const [clock] = await tx.query(db.raw.sql`
        SELECT clock_timestamp()::timestamptz AS "createdAt"
      `.returnsRow({ createdAt: "pg/timestamptz-date@1" }).build());
      const createdAt = Temporal.Instant.fromEpochMilliseconds(clock.createdAt.getTime());
      const holdExpiresAt = createdAt.add({ minutes: holdMinutes });
      const { quote, pricing } = result;
      const booking = await tx.orm.public.Booking.create({
        bookingNumber: `UM-${randomBytes(8).toString("hex").toUpperCase()}`,
        departureId,
        roomOptionId,
        status: "PENDING",
        guestContactName: name,
        guestContactPhone: phone,
        guestContactEmail: email,
        reservationKey,
        reservationFingerprint: fingerprint,
        createdAt: createdAt.toString(),
        updatedAt: createdAt.toString(),
        holdExpiresAt,
        totalAmount: quote.total,
        dueAmount: quote.total,
        adultFareAtBooking: pricing.adultFare,
        childFareAtBooking: pricing.childFeeEnabled ? pricing.childFare : "0",
        roomSurchargeAtBooking: quote.roomSurcharge,
        childFeeEnabledAtBooking: pricing.childFeeEnabled,
      });
      await tx.execute(tx.sql.public.Passenger.insert(
        travelers.map((traveler) => ({
          ...traveler,
          bookingId: booking.id,
          updatedAt: createdAt.toString(),
        }))
      ).build());

      return Response.json({
        bookingNumber: booking.bookingNumber,
        holdExpiresAt: holdExpiresAt.toString(),
      }, { status: 201 });
    });
  } catch (error) {
    console.error("CREATE RESERVATION ERROR:", error);
    return fail("এখন আসন সংরক্ষণ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।", 500);
  }
}
