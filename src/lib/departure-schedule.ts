import { Temporal } from "temporal-polyfill";

const timeZone = "Asia/Dhaka";

export type ScheduleFields = {
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
};

export type DepartureSchedule = {
  departureDate: Temporal.Instant;
  departureTime: string | null;
  returnDate: Temporal.Instant | null;
  returnTime: string | null;
};

function localTime(date: string, time = "00:00") {
  return Temporal.PlainDate.from(date).toZonedDateTime({ timeZone, plainTime: time }).toInstant();
}

export function localDepartureDay(instant: Temporal.Instant) {
  return instant.toZonedDateTimeISO(timeZone).toPlainDate();
}

export function scheduleFields(schedule: DepartureSchedule): ScheduleFields {
  function displayTime(instant: Temporal.Instant | null, time: string | null) {
    if (!instant || !time) return "";
    return instant.toZonedDateTimeISO(timeZone).toPlainTime().toString({ smallestUnit: "minute" });
  }
  return {
    departureDate: localDepartureDay(schedule.departureDate).toString(),
    departureTime: displayTime(schedule.departureDate, schedule.departureTime),
    returnDate: schedule.returnDate ? localDepartureDay(schedule.returnDate).toString() : "",
    returnTime: displayTime(schedule.returnDate, schedule.returnTime),
  };
}

export function transportEnd(schedule: DepartureSchedule) {
  if (schedule.returnDate && schedule.returnTime) return schedule.returnDate;
  return localTime(localDepartureDay(schedule.returnDate ?? schedule.departureDate).add({ days: 1 }).toString());
}

export function parseDepartureSchedule(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Enter valid departure dates and times." } as const;
  }
  const input = value as Record<string, unknown>;
  const { departureDate } = input;
  const departureTime = input.departureTime ?? "";
  const returnDate = input.returnDate ?? "";
  const returnTime = input.returnTime ?? "";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (typeof departureDate !== "string" || !datePattern.test(departureDate) ||
      typeof returnDate !== "string" || (returnDate && !datePattern.test(returnDate)) ||
      typeof departureTime !== "string" || (departureTime && !timePattern.test(departureTime)) ||
      typeof returnTime !== "string" || (returnTime && !timePattern.test(returnTime))) {
    return { error: "Enter valid departure dates and times." } as const;
  }
  if (returnTime && !returnDate) return { error: "Add a return date before entering a return time." } as const;
  try {
    const schedule = {
      departureDate: localTime(departureDate, departureTime || "00:00"),
      returnDate: returnDate ? localTime(returnDate, returnTime || "00:00") : null,
      departureTime: departureTime || null,
      returnTime: returnTime || null,
    };
    if (Temporal.Instant.compare(transportEnd(schedule), schedule.departureDate) <= 0) {
      return { error: "Return must be after departure." } as const;
    }
    return { schedule };
  } catch {
    return { error: "Enter valid departure dates and times." } as const;
  }
}
