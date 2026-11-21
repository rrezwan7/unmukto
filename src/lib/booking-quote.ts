export type PassengerCounts = {
  adults: number;
  children: number;
  infants: number;
};

export type BookingQuote = {
  adultSubtotal: string;
  childSubtotal: string;
  roomSurcharge: string;
  total: string;
  seatsRequired: number;
};

type Fares = {
  adultFare: string;
  childFare: string;
  childFeeEnabled: boolean;
};

type RoomLimits = {
  surcharge: string;
  maxAdults: number | null;
  maxChildren: number | null;
  maxOccupants: number | null;
};

const poishaPerTaka = BigInt(100);

function toPoisha(amount: string) {
  const parts = /^(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!parts) throw new Error("Invalid stored fare");
  const [, whole, fraction = ""] = parts;
  const poisha = BigInt(whole) * poishaPerTaka + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  return fraction.length > 2 && fraction[2] >= "5" ? poisha + BigInt(1) : poisha;
}

function formatTaka(poisha: bigint) {
  return `${poisha / poishaPerTaka}.${String(poisha % poishaPerTaka).padStart(2, "0")}`;
}

export function calculateBookingQuote(
  { adults, children, infants }: PassengerCounts,
  fares: Fares,
  room: RoomLimits,
): BookingQuote | null {
  if (
    (room.maxAdults !== null && adults > room.maxAdults) ||
    (room.maxChildren !== null && children > room.maxChildren) ||
    (room.maxOccupants !== null && adults + children + infants > room.maxOccupants)
  ) {
    return null;
  }

  const adultSubtotal = BigInt(adults) * toPoisha(fares.adultFare);
  const paidChildren = fares.childFeeEnabled ? children : 0;
  const childSubtotal = paidChildren ? BigInt(paidChildren) * toPoisha(fares.childFare) : BigInt(0);
  const roomSurcharge = toPoisha(room.surcharge);

  return {
    adultSubtotal: formatTaka(adultSubtotal),
    childSubtotal: formatTaka(childSubtotal),
    roomSurcharge: formatTaka(roomSurcharge),
    total: formatTaka(adultSubtotal + childSubtotal + roomSurcharge),
    seatsRequired: adults + paidChildren,
  };
}
