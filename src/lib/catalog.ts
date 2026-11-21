import "server-only";
import { committedSeatCounts } from "@/lib/reservation-inventory";

export type PublicTourSummary = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  startingFare: string | null;
  upcomingDeparturesCount: number;
  nextDepartureDate: string | null;
  hasOpenBooking: boolean;
  totalAvailableSeats: number;
  durationLabel: string;
};

export type PublicDestination = {
  id: number;
  name: string;
  description: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
};

export type PublicItinerary = {
  id: number;
  dayNumber: number;
  title: string;
  description: string | null;
  destinations: PublicDestination[];
};

export type PublicRoomOption = {
  id: number;
  roomType: "SHARED" | "COUPLE" | "PRIVATE";
  surcharge: string;
  maxAdults: number | null;
  maxChildren: number | null;
  maxOccupants: number | null;
  description: string | null;
};

export type PublicDeparture = {
  id: number;
  departureDate: string;
  departureTime: string | null;
  returnDate: string | null;
  returnTime: string | null;
  bookingOpen: boolean;
  pricing: {
    adultFare: string;
    childFeeEnabled: boolean;
    childFare: string;
  } | null;
  roomOptions: PublicRoomOption[];
  vehiclesSummary: string[];
  totalCapacity: number;
  availableSeats: number;
  isSoldOut: boolean;
};

export type PublicTourDetail = {
  tour: {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    coverImage: string | null;
    durationLabel: string;
  };
  itineraries: PublicItinerary[];
  departures: PublicDeparture[];
};

function formatIsoDate(instant: { toString: () => string }): string {
  try {
    return instant.toString().split("T")[0];
  } catch {
    return String(instant);
  }
}

export async function getPublicTours(): Promise<PublicTourSummary[]> {
  const { db } = await import("@/prisma/db");

  const [tours, departures, itineraries, pricingRecords, allocations, vehicles, seats, committedSeats] =
    await Promise.all([
      db.orm.public.Tour.where({ isActive: true }).all(),
      db.orm.public.Departure.where({ customerVisible: true }).all(),
      db.orm.public.Itinerary.all(),
      db.orm.public.DeparturePricing.all(),
      db.orm.public.DepartureVehicle.where({ visibleToCustomer: true }).all(),
      db.orm.public.Vehicle.where({ isActive: true }).all(),
      db.orm.public.Seat.where({ isAvailable: true }).all(),
      committedSeatCounts(),
    ]);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  // Count available seats per layout
  const seatCountByLayout = new Map<number, number>();
  for (const s of seats) {
    seatCountByLayout.set(
      s.seatLayoutId,
      (seatCountByLayout.get(s.seatLayoutId) ?? 0) + 1
    );
  }

  // Group departures by tourId
  const departuresByTour = new Map<number, typeof departures>();
  for (const dep of departures) {
    const list = departuresByTour.get(dep.tourId) ?? [];
    list.push(dep);
    departuresByTour.set(dep.tourId, list);
  }

  // Pricing map
  const pricingByDeparture = new Map(
    pricingRecords.map((p) => [p.departureId, p])
  );

  // Allocations by departure
  const allocationsByDeparture = new Map<number, typeof allocations>();
  for (const alloc of allocations) {
    const list = allocationsByDeparture.get(alloc.departureId) ?? [];
    list.push(alloc);
    allocationsByDeparture.set(alloc.departureId, list);
  }

  // Itinerary count by tourId
  const itineraryCountByTour = new Map<number, number>();
  for (const it of itineraries) {
    itineraryCountByTour.set(
      it.tourId,
      (itineraryCountByTour.get(it.tourId) ?? 0) + 1
    );
  }

  tours.sort((a, b) => a.id - b.id);

  return tours.map((tour) => {
    const tourDepartures = departuresByTour.get(tour.id) ?? [];
    tourDepartures.sort((a, b) => {
      const aTime = a.departureDate.epochNanoseconds;
      const bTime = b.departureDate.epochNanoseconds;
      if (aTime < bTime) return -1;
      if (aTime > bTime) return 1;
      return a.id - b.id;
    });

    let minFare: number | null = null;
    let totalAvailSeats = 0;
    let hasOpen = false;

    for (const dep of tourDepartures) {
      if (dep.bookingOpen) hasOpen = true;

      const p = pricingByDeparture.get(dep.id);
      if (p) {
        const fare = Number(p.adultFare);
        if (Number.isFinite(fare) && (minFare === null || fare < minFare)) {
          minFare = fare;
        }
      }

      // Calculate seats for this departure
      const depAllocations = allocationsByDeparture.get(dep.id) ?? [];
      let depCapacity = 0;
      for (const alloc of depAllocations) {
        const v = vehicleMap.get(alloc.vehicleId);
        if (v?.seatLayoutId) {
          depCapacity += seatCountByLayout.get(v.seatLayoutId) ?? 0;
        }
      }
      const depAssigned = committedSeats.get(dep.id) ?? 0;
      totalAvailSeats += Math.max(0, depCapacity - depAssigned);
    }

    const nextDep = tourDepartures[0];
    const nextDepartureDate = nextDep ? formatIsoDate(nextDep.departureDate) : null;

    const daysCount = itineraryCountByTour.get(tour.id) ?? 0;
    const durationLabel =
      daysCount > 0
        ? `${daysCount} দিন ${Math.max(1, daysCount - 1)} রাত`
        : "তারিখ অনুযায়ী";

    return {
      id: tour.id,
      title: tour.title,
      slug: tour.slug,
      description: tour.description,
      coverImage: tour.coverImage,
      startingFare: minFare !== null ? String(minFare) : null,
      upcomingDeparturesCount: tourDepartures.length,
      nextDepartureDate,
      hasOpenBooking: hasOpen,
      totalAvailableSeats: totalAvailSeats,
      durationLabel,
    };
  });
}

export async function getPublicTourBySlug(
  slug: string
): Promise<PublicTourDetail | null> {
  const { db } = await import("@/prisma/db");

  const tour = await db.orm.public.Tour
    .where({ slug })
    .first();

  if (!tour || !tour.isActive) {
    return null;
  }

  const [itineraries, departures, pricingRecords, roomOptions, allocations, vehicles, seats, committedSeats] =
    await Promise.all([
      db.orm.public.Itinerary.where({ tourId: tour.id })
        .include("destinations", (stops) => stops.orderBy([(stop) => stop.displayOrder.asc(), (stop) => stop.id.asc()]))
        .orderBy((day) => day.dayNumber.asc())
        .all(),
      db.orm.public.Departure.where({ tourId: tour.id }).all(),
      db.orm.public.DeparturePricing.all(),
      db.orm.public.DepartureRoomOption.where({ isAvailable: true }).all(),
      db.orm.public.DepartureVehicle.where({ visibleToCustomer: true }).all(),
      db.orm.public.Vehicle.where({ isActive: true }).all(),
      db.orm.public.Seat.where({ isAvailable: true }).all(),
      committedSeatCounts(),
    ]);

  const visibleDepartures = departures.filter((d) => d.customerVisible);

  const structuredItineraries: PublicItinerary[] = itineraries.map((it) => ({
    id: it.id,
    dayNumber: it.dayNumber,
    title: it.title,
    description: it.description,
    destinations: it.destinations.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      arrivalTime: d.arrivalTime,
      departureTime: d.departureTime,
    })),
  }));

  // Sort departures chronologically
  visibleDepartures.sort((a, b) => {
    const aTime = a.departureDate.epochNanoseconds;
    const bTime = b.departureDate.epochNanoseconds;
    if (aTime < bTime) return -1;
    if (aTime > bTime) return 1;
    return a.id - b.id;
  });

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  const seatCountByLayout = new Map<number, number>();
  for (const s of seats) {
    seatCountByLayout.set(
      s.seatLayoutId,
      (seatCountByLayout.get(s.seatLayoutId) ?? 0) + 1
    );
  }

  const pricingByDeparture = new Map(
    pricingRecords.map((p) => [p.departureId, p])
  );

  const roomOptionsByDeparture = new Map<number, typeof roomOptions>();
  for (const ro of roomOptions) {
    const list = roomOptionsByDeparture.get(ro.departureId) ?? [];
    list.push(ro);
    roomOptionsByDeparture.set(ro.departureId, list);
  }

  const allocationsByDeparture = new Map<number, typeof allocations>();
  for (const alloc of allocations) {
    const list = allocationsByDeparture.get(alloc.departureId) ?? [];
    list.push(alloc);
    allocationsByDeparture.set(alloc.departureId, list);
  }

  const structuredDepartures: PublicDeparture[] = visibleDepartures.map((dep) => {
    const pricing = pricingByDeparture.get(dep.id);
    const depRooms = roomOptionsByDeparture.get(dep.id) ?? [];
    depRooms.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);

    const depAllocations = allocationsByDeparture.get(dep.id) ?? [];
    let depCapacity = 0;
    const vehiclesSummary: string[] = [];

    for (const alloc of depAllocations) {
      const v = vehicleMap.get(alloc.vehicleId);
      if (v) {
        const name = alloc.displayName || v.name;
        vehiclesSummary.push(name);
        if (v.seatLayoutId) {
          depCapacity += seatCountByLayout.get(v.seatLayoutId) ?? 0;
        }
      }
    }

    const assignedCount = committedSeats.get(dep.id) ?? 0;
    const availableSeats = Math.max(0, depCapacity - assignedCount);
    const isSoldOut = depCapacity > 0 && availableSeats === 0;

    return {
      id: dep.id,
      departureDate: formatIsoDate(dep.departureDate),
      departureTime: dep.departureTime,
      returnDate: dep.returnDate ? formatIsoDate(dep.returnDate) : null,
      returnTime: dep.returnTime,
      bookingOpen: dep.bookingOpen && availableSeats > 0 && dep.departureDate.epochMilliseconds > Date.now(),
      pricing: pricing
        ? {
            adultFare: pricing.adultFare.toString(),
            childFeeEnabled: pricing.childFeeEnabled,
            childFare: pricing.childFare.toString(),
          }
        : null,
      roomOptions: depRooms.map((r) => ({
        id: r.id,
        roomType: r.roomType,
        surcharge: r.surcharge.toString(),
        maxAdults: r.maxAdults,
        maxChildren: r.maxChildren,
        maxOccupants: r.maxOccupants,
        description: r.description,
      })),
      vehiclesSummary,
      totalCapacity: depCapacity,
      availableSeats,
      isSoldOut,
    };
  });

  const daysCount = structuredItineraries.length;
  const durationLabel =
    daysCount > 0
      ? `${daysCount} দিন ${Math.max(1, daysCount - 1)} রাত`
      : "যাত্রার তারিখ অনুযায়ী";

  return {
    tour: {
      id: tour.id,
      title: tour.title,
      slug: tour.slug,
      description: tour.description,
      coverImage: tour.coverImage,
      durationLabel,
    },
    itineraries: structuredItineraries,
    departures: structuredDepartures,
  };
}
