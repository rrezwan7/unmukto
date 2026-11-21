import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/prisma/db";

type TourTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StopInput = {
  id: number | null;
  name: string;
  description: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
};

export type DayInput = {
  id: number | null;
  title: string;
  description: string | null;
  stops: StopInput[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDatabaseId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
}

export function isOptionalText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function trimmedText(value: string | null) {
  return value?.trim() || null;
}

export function parseItineraryDays(input: unknown): DayInput[] | null {
  if (!Array.isArray(input)) return null;
  const days: DayInput[] = [];
  const dayIds = new Set<number>();
  const stopIds = new Set<number>();

  for (const day of input) {
    if (!isRecord(day) || (day.id !== null && !isDatabaseId(day.id)) ||
        typeof day.title !== "string" || !day.title.trim() ||
        !isOptionalText(day.description) || !Array.isArray(day.stops)) return null;
    if (day.id !== null) {
      if (dayIds.has(day.id)) return null;
      dayIds.add(day.id);
    }

    const stops: StopInput[] = [];
    for (const stop of day.stops) {
      if (!isRecord(stop) || (stop.id !== null && !isDatabaseId(stop.id)) ||
          typeof stop.name !== "string" || !stop.name.trim() || !isOptionalText(stop.description) ||
          !isOptionalText(stop.arrivalTime) || !isOptionalText(stop.departureTime)) return null;
      if (stop.id !== null) {
        if (stopIds.has(stop.id)) return null;
        stopIds.add(stop.id);
      }
      stops.push({
        id: stop.id,
        name: stop.name.trim(),
        description: trimmedText(stop.description),
        arrivalTime: trimmedText(stop.arrivalTime),
        departureTime: trimmedText(stop.departureTime),
      });
    }
    days.push({ id: day.id, title: day.title.trim(), description: trimmedText(day.description), stops });
  }
  return days;
}

export async function lockTour(tx: TourTransaction, tourId: number) {
  const [tour] = await tx.query(db.raw.sql`
    SELECT "isActive" FROM "Tour" WHERE id = ${tourId}::int FOR UPDATE
  `.returnsRow({ isActive: "pg/bool@1" }).build());
  return tour;
}

export async function getTourItinerary(tourId: number, tx?: TourTransaction) {
  const rows = await (tx ?? db).orm.public.Itinerary.where({ tourId })
    .select("id", "dayNumber", "title", "description")
    .include("destinations", (stops) => stops
      .select("id", "name", "description", "arrivalTime", "departureTime", "displayOrder")
      .include("hotelStays", (stays) => stays.count())
      .orderBy([(stop) => stop.displayOrder.asc(), (stop) => stop.id.asc()]))
    .orderBy((day) => day.dayNumber.asc())
    .all();
  const days = rows.map(({ destinations, ...day }) => ({
    ...day,
    stops: destinations.map(({ hotelStays, ...stop }) => ({ ...stop, linkedToStay: hotelStays > 0 })),
  }));
  const snapshot = days.map((day) => [
    day.id, day.dayNumber, day.title, day.description,
    day.stops.map((stop) => [stop.id, stop.name, stop.description, stop.arrivalTime, stop.departureTime, stop.displayOrder]),
  ]);
  const version = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  return { days, version };
}

export type TourItinerary = Awaited<ReturnType<typeof getTourItinerary>>;

export async function saveTourItinerary(tourId: number, version: string, days: DayInput[]) {
  return db.transaction(async (tx) => {
    if (!(await lockTour(tx, tourId))) return { error: "Tour not found.", status: 404 } as const;
    const current = await getTourItinerary(tourId, tx);
    if (current.version !== version) {
      return { error: "The itinerary changed since you opened it. Reload the page before saving again.", status: 409 } as const;
    }

    const currentById = new Map(current.days.map((day) => [day.id, day]));
    const requestedById = new Map(days.map((day) => [day.id, day]));
    for (const day of days) {
      const existing = day.id === null ? undefined : currentById.get(day.id);
      if (day.id !== null && !existing) return { error: "A day does not belong to this tour.", status: 400 } as const;
      const stopIds = new Set(existing?.stops.map(({ id }) => id));
      if (day.stops.some((stop) => stop.id !== null && !stopIds.has(stop.id))) {
        return { error: "A stop does not belong to its itinerary day.", status: 400 } as const;
      }
    }

    for (const day of current.days) {
      const retainedStops = new Set(requestedById.get(day.id)?.stops.map(({ id }) => id));
      const linkedStop = day.stops.find((stop) => stop.linkedToStay && !retainedStops.has(stop.id));
      if (linkedStop) {
        return { error: `“${linkedStop.name}” is linked to a hotel stay. Keep the stop or update the stay before removing it.`, status: 409 } as const;
      }
    }

    const { Itinerary, Destination } = tx.orm.public;
    for (const day of current.days) {
      const requested = requestedById.get(day.id);
      if (!requested) {
        await Itinerary.where({ id: day.id }).delete();
        continue;
      }
      const retainedStops = new Set(requested.stops.map(({ id }) => id));
      for (const stop of day.stops) {
        if (!retainedStops.has(stop.id)) await Destination.where({ id: stop.id }).delete();
      }
    }

    // Move changing day numbers out of the published range before swapping them.
    const occupiedNumbers = new Set(current.days.map((day) => day.dayNumber));
    let temporaryNumber = -1;
    for (const [index, day] of days.entries()) {
      if (day.id === null || currentById.get(day.id)?.dayNumber === index + 1) continue;
      while (occupiedNumbers.has(temporaryNumber)) temporaryNumber--;
      await Itinerary.where({ id: day.id }).update({ dayNumber: temporaryNumber });
      temporaryNumber--;
    }

    for (const [index, day] of days.entries()) {
      const { id, title, description, stops } = day;
      const previous = id === null ? undefined : currentById.get(id);
      const values = { title, description, dayNumber: index + 1 };
      let itineraryId = id;
      if (itineraryId === null) {
        itineraryId = (await Itinerary.create({ tourId, ...values })).id;
      } else if (previous?.dayNumber !== values.dayNumber || previous.title !== title || previous.description !== description) {
        await Itinerary.where({ id: itineraryId }).update(values);
      }
      const previousStops = new Map(previous?.stops.map((stop) => [stop.id, stop]));
      for (const [stopIndex, stop] of stops.entries()) {
        const { id: stopId, ...details } = stop;
        const values = { ...details, displayOrder: stopIndex + 1 };
        if (stopId === null) {
          await Destination.create({ itineraryId, ...values });
        } else {
          const before = previousStops.get(stopId);
          if (!before || before.displayOrder !== values.displayOrder || before.name !== values.name ||
              before.description !== values.description || before.arrivalTime !== values.arrivalTime ||
              before.departureTime !== values.departureTime) {
            await Destination.where({ id: stopId }).update(values);
          }
        }
      }
    }
    return { itinerary: await getTourItinerary(tourId, tx) };
  });
}
