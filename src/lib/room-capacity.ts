export type RoomNights = { checkIn: string; checkOut: string };

export type RoomCommitment = RoomNights & {
  stayId: number;
  allotted: number;
  assigned: number;
  held?: number;
};

export function roomUnits(exclusive: boolean, allotted: number, assigned: number) {
  const committed = Math.max(allotted, assigned);
  return exclusive && committed > 0 ? 1 : committed;
}

export function peakRoomUsage(
  commitments: RoomCommitment[],
  exclusive: boolean,
  window?: RoomNights,
) {
  const changes = new Map<string, number>();

  for (const commitment of commitments) {
    const checkIn = window && window.checkIn > commitment.checkIn ? window.checkIn : commitment.checkIn;
    const checkOut = window && window.checkOut < commitment.checkOut ? window.checkOut : commitment.checkOut;
    if (checkIn >= checkOut) continue;

    const units = roomUnits(exclusive, commitment.allotted, commitment.assigned + (commitment.held ?? 0));
    changes.set(checkIn, (changes.get(checkIn) ?? 0) + units);
    changes.set(checkOut, (changes.get(checkOut) ?? 0) - units);
  }

  // Check-in and checkout on the same day share a boundary, not a night.
  let inUse = 0;
  let peak = 0;
  for (const day of [...changes.keys()].sort()) {
    inUse += changes.get(day) ?? 0;
    peak = Math.max(peak, inUse);
  }
  return peak;
}

export function roomAvailability(
  room: { roomType: string; capacity: number },
  stay: RoomNights & { id: number },
  commitments: RoomCommitment[],
) {
  const exclusive = room.roomType !== "SHARED";
  const current = commitments.find((commitment) => commitment.stayId === stay.id);
  const others = commitments.filter((commitment) => commitment.stayId !== stay.id);
  const allotted = current?.allotted ?? 0;
  const assigned = current?.assigned ?? 0;
  const held = current?.held ?? 0;
  const committed = roomUnits(exclusive, allotted, assigned + held);
  const otherUse = peakRoomUsage(others, exclusive, stay);
  const available = Math.max(0, (exclusive ? 1 : room.capacity) - otherUse);
  const overbooked = committed > available;
  const occupantLimit = exclusive && available > 0 ? room.capacity : available;

  return {
    exclusive,
    allotted,
    assigned,
    held,
    available,
    overbooked,
    availableSlots: overbooked || (exclusive && held > 0) ? 0 : Math.max(0, occupantLimit - assigned - held),
  };
}
