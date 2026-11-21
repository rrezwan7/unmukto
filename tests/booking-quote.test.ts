import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateBookingQuote } from "../src/lib/booking-quote";

const fares = { adultFare: "1200.15", childFare: "450.29", childFeeEnabled: true };
const room = { surcharge: "500.63", maxAdults: 2, maxChildren: 1, maxOccupants: 4 };
const passengers = { adults: 2, children: 1, infants: 1 };

test("quotes exact fares, one room surcharge, and seats for adults and paid children", () => {
  assert.deepEqual(calculateBookingQuote(passengers, fares, room), {
    adultSubtotal: "2400.30",
    childSubtotal: "450.29",
    roomSurcharge: "500.63",
    total: "3351.22",
    seatsRequired: 3,
  });
});

test("free children and infants count toward room occupancy", () => {
  const freeChildFares = { ...fares, childFeeEnabled: false };
  const quote = calculateBookingQuote(passengers, freeChildFares, room);
  assert.equal(quote?.childSubtotal, "0.00");
  assert.equal(quote?.seatsRequired, 2);
  assert.equal(calculateBookingQuote(passengers, freeChildFares, { ...room, maxOccupants: 3 }), null);
  assert.equal(calculateBookingQuote(passengers, freeChildFares, { ...room, maxChildren: 0 }), null);
  assert.equal(calculateBookingQuote(passengers, freeChildFares, { ...room, maxAdults: 1 }), null);
});
