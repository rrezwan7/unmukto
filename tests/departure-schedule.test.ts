import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDepartureSchedule, scheduleFields, transportEnd } from "../src/lib/departure-schedule";

test("departure dates round-trip in Bangladesh time across UTC midnight", () => {
  const fields = { departureDate: "2032-02-29", departureTime: "00:30", returnDate: "2032-03-01", returnTime: "02:00" };
  const { schedule } = parseDepartureSchedule(fields);
  assert(schedule);
  assert.equal(schedule.departureDate.toString(), "2032-02-28T18:30:00Z");
  assert.deepEqual(scheduleFields(schedule), fields);
});

test("rejects dates that do not exist or returns before departure", () => {
  assert.match(parseDepartureSchedule({ departureDate: "2031-02-29" }).error ?? "", /valid/i);
  assert.match(parseDepartureSchedule({ departureDate: "2032-03-01", departureTime: "14:00", returnDate: "2032-03-01", returnTime: "10:00" }).error ?? "", /after departure/i);
  assert.match(parseDepartureSchedule({ departureDate: "2032-03-01", returnTime: "10:00" }).error ?? "", /return date/i);
});

test("a date without a return time reserves the vehicle through that local day", () => {
  const { schedule } = parseDepartureSchedule({ departureDate: "2032-03-01", departureTime: "14:00", returnDate: "2032-03-02" });
  assert(schedule);
  assert.equal(transportEnd(schedule).toString(), "2032-03-02T18:00:00Z");
});
