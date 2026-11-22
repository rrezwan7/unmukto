import { bookingIdIsValid, getDepartureBookingQuote } from "@/lib/departure-booking-quote";
import { checkoutLodgingSetting } from "@/lib/booking-room-holds";
import { guestBookingIsEnabled } from "@/lib/booking-settings";

function countIsValid(value: unknown): value is number {
  return value === 0 || bookingIdIsValid(value);
}

export async function POST(request: Request) {
  const input: unknown = await request.json().catch(() => null);
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return Response.json({ error: "ভাড়া হিসাবের জন্য যাত্রী ও রুমের তথ্য দিন।" }, { status: 400 });
  }

  const { departureId, roomOptionId, adults, children, infants } = input as Record<string, unknown>;
  if (
    !bookingIdIsValid(departureId) || !bookingIdIsValid(roomOptionId) ||
    !bookingIdIsValid(adults) || !countIsValid(children) || !countIsValid(infants)
  ) {
    return Response.json(
      { error: "সঠিক রুম বেছে নিন এবং কমপক্ষে একজন প্রাপ্তবয়স্ক যাত্রী যোগ করুন।" },
      { status: 400 },
    );
  }

  try {
    const result = await getDepartureBookingQuote(departureId, roomOptionId, { adults, children, infants });
    if (result.error !== undefined) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    const lodging = await checkoutLodgingSetting(departureId);
    return Response.json({
      quote: result.quote,
      quoteVersion: result.quoteVersion,
      guestBookingEnabled: await guestBookingIsEnabled(),
      lodgingHoldsEnabled: lodging.enabled,
    });
  } catch (error) {
    console.error("BOOKING QUOTE ERROR:", error);
    return Response.json({ error: "এখন ভাড়া হিসাব করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
