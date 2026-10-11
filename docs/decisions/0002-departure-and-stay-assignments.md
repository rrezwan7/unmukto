# 0002 — Scope seat and room assignments to trips and stays

Status: implemented on a testing branch; local runner verification pending.
Date: 2026-10-12 (Bangladesh)

Keep existing Tour, Departure, Vehicle, SeatLayout, Hotel and HotelStay entities.
Add departure scope to SeatAssignment instead of treating vehicle seats as
lifetime reservations. Keep vehicleId and seatId; link departureId + vehicleId
to the existing unique DepartureVehicle allocation. Preserve one transport seat
assignment per passenger for V1.

Replace passenger-global room uniqueness with passenger + stay uniqueness. The
passenger inverse relation becomes a collection, allowing multiple hotel stays.
One room option per booking still governs V1 pricing; operational room assignments
for different nights do not create additional room surcharges.

Backfill seat departure from the passenger's booking. Existing rows are retained.
The migration must fail transactionally when a matching vehicle allocation is
missing, rather than guessing an allocation or silently deleting the assignment.

This does not solve sold capacity, simultaneous booking, physical resource date
overlaps, passenger/departure consistency or room occupancy. Those are explicit
requirements for future reservation and assignment services.
