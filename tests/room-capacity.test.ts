import assert from "node:assert/strict";
import { test } from "node:test";
import { peakRoomUsage, roomAvailability } from "../src/lib/room-capacity";

const stay = { id: 1, checkIn: "2030-01-02", checkOut: "2030-01-06" };
const shared = { roomType: "SHARED", capacity: 4 };

test("shared allotments use the busiest night and count occupants within their allotment once", () => {
  const commitments = [
    { stayId: 1, checkIn: "2030-01-02", checkOut: "2030-01-06", allotted: 1, assigned: 1 },
    { stayId: 2, checkIn: "2030-01-01", checkOut: "2030-01-04", allotted: 3, assigned: 2 },
    { stayId: 3, checkIn: "2030-01-04", checkOut: "2030-01-07", allotted: 0, assigned: 2 },
  ];
  assert.equal(peakRoomUsage(commitments, false), 4);
  assert.deepEqual(roomAvailability(shared, stay, commitments), {
    exclusive: false, allotted: 1, assigned: 1, available: 1, overbooked: false, availableSlots: 0,
  });
});

test("an exclusive room is blocked for the entire stay if any night overlaps", () => {
  const room = { roomType: "COUPLE", capacity: 3 };
  const commitments = [{ stayId: 2, checkIn: "2030-01-01", checkOut: "2030-01-03", allotted: 0, assigned: 2 }];
  assert.equal(roomAvailability(room, stay, commitments).availableSlots, 0);
  assert.equal(roomAvailability(room, { ...stay, checkIn: "2030-01-03" }, commitments).availableSlots, 3);
});

test("pre-existing overbooking remains visible and offers no new places", () => {
  const commitments = [
    { stayId: 1, checkIn: "2030-01-02", checkOut: "2030-01-06", allotted: 0, assigned: 2 },
    { stayId: 2, checkIn: "2030-01-03", checkOut: "2030-01-05", allotted: 0, assigned: 3 },
  ];
  const inventory = roomAvailability(shared, stay, commitments);
  assert.equal(inventory.assigned, 2);
  assert.equal(inventory.overbooked, true);
  assert.equal(inventory.availableSlots, 0);
});
