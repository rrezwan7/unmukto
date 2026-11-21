"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DayInput, StopInput, TourItinerary } from "@/lib/tour-editor";

type DraftStop = StopInput & { key: string; linkedToStay: boolean };
type DraftDay = Omit<DayInput, "stops"> & { key: string; stops: DraftStop[] };

function makeDraft(itinerary: TourItinerary): DraftDay[] {
  return itinerary.days.map(({ id, title, description, stops }) => ({
    id, title, description, key: `day-${id}`,
    stops: stops.map((stop) => ({ ...stop, key: `stop-${stop.id}` })),
  }));
}

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function OrderControls({ label, index, length, onMove }: {
  label: string;
  index: number;
  length: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" aria-label={`Move ${label} up`}
        disabled={index === 0} onClick={() => onMove(-1)}>↑</Button>
      <Button type="button" variant="outline" size="sm" aria-label={`Move ${label} down`}
        disabled={index === length - 1} onClick={() => onMove(1)}>↓</Button>
    </>
  );
}

export default function ItineraryEditor({ tourId, initialItinerary }: {
  tourId: number;
  initialItinerary: TourItinerary;
}) {
  const [saved, setSaved] = useState(initialItinerary);
  const [days, setDays] = useState(() => makeDraft(initialItinerary));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const nextKey = useRef(0);

  function changeDays(update: (current: DraftDay[]) => DraftDay[]) {
    setDays(update);
    setMessage("");
  }

  function changeDay(key: string, update: (day: DraftDay) => DraftDay) {
    changeDays((current) => current.map((day) => day.key === key ? update(day) : day));
  }

  function changeStop(dayKey: string, stopKey: string, changes: Partial<StopInput>) {
    changeDay(dayKey, (day) => ({
      ...day,
      stops: day.stops.map((stop) => stop.key === stopKey ? { ...stop, ...changes } : stop),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const remainingDayIds = new Set(days.map((day) => day.id));
    const remainingStopIds = new Set(days.flatMap((day) => day.stops.map((stop) => stop.id)));
    const hasRemovals = saved.days.some((day) =>
      !remainingDayIds.has(day.id) || day.stops.some((stop) => !remainingStopIds.has(stop.id)));
    if (hasRemovals && !window.confirm("Save the itinerary and remove the days or stops you marked for removal?")) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/tours/${tourId}/itinerary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: saved.version, days }),
      });
      const result = await response.json() as { itinerary?: TourItinerary; error?: string };
      if (!response.ok || !result.itinerary) throw new Error(result.error ?? "Could not save the itinerary.");
      setSaved(result.itinerary);
      setDays(makeDraft(result.itinerary));
      setMessage("Itinerary saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the itinerary.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="itinerary" className="rounded-lg border bg-card p-5">
      <h2 id="itinerary" className="mb-4 text-lg font-semibold">Itinerary</h2>
      <form onSubmit={save}>
        <fieldset disabled={saving} className="space-y-4">
          {days.length === 0 && <p className="text-sm text-muted-foreground">Add a day to start the itinerary.</p>}
          {days.map((day, dayIndex) => {
            const dayLabel = `day ${dayIndex + 1}`;
            const hasLinkedStop = day.stops.some((stop) => stop.linkedToStay);
            return (
              <fieldset className="space-y-4 rounded-lg border p-4" key={day.key}>
                <legend className="px-1 font-semibold">Day {dayIndex + 1}</legend>
                <div className="flex flex-wrap items-center gap-2">
                  <OrderControls label={dayLabel} index={dayIndex} length={days.length}
                    onMove={(direction) => changeDays((current) => move(current, dayIndex, direction))} />
                  <Button type="button" variant="destructive" size="sm" disabled={hasLinkedStop} aria-label={`Remove ${dayLabel}`}
                    onClick={() => changeDays((current) => current.filter((item) => item.key !== day.key))}>Remove day</Button>
                  {hasLinkedStop && <span className="text-xs text-muted-foreground">This day includes a stop linked to a hotel stay.</span>}
                </div>
                <label className="grid gap-1.5 text-sm font-medium">
                  Day title
                  <Input required value={day.title} onChange={(event) => {
                    const title = event.target.value;
                    changeDay(day.key, (current) => ({ ...current, title }));
                  }} />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Day description
                  <Textarea rows={2} value={day.description ?? ""} onChange={(event) => {
                    const description = event.target.value;
                    changeDay(day.key, (current) => ({ ...current, description }));
                  }} />
                </label>
                {day.stops.map((stop, stopIndex) => (
                  <fieldset className="space-y-3 rounded-md border bg-muted/25 p-3" key={stop.key}>
                    <legend className="px-1 text-sm font-medium">Stop {stopIndex + 1}</legend>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderControls label={`stop ${stopIndex + 1} on ${dayLabel}`} index={stopIndex} length={day.stops.length}
                        onMove={(direction) => changeDay(day.key, (current) => ({ ...current, stops: move(current.stops, stopIndex, direction) }))} />
                      <Button type="button" variant="destructive" size="sm" disabled={stop.linkedToStay}
                        aria-label={`Remove stop ${stopIndex + 1} on ${dayLabel}`}
                        onClick={() => changeDay(day.key, (current) => ({ ...current, stops: current.stops.filter((item) => item.key !== stop.key) }))}>Remove stop</Button>
                      {stop.linkedToStay && <span className="text-xs text-muted-foreground">Linked to a hotel stay</span>}
                    </div>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Destination name
                      <Input required value={stop.name} onChange={(event) => changeStop(day.key, stop.key, { name: event.target.value })} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-medium">
                        Arrival time
                        <Input placeholder="08:00" value={stop.arrivalTime ?? ""}
                          onChange={(event) => changeStop(day.key, stop.key, { arrivalTime: event.target.value })} />
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium">
                        Departure time
                        <Input placeholder="10:30" value={stop.departureTime ?? ""}
                          onChange={(event) => changeStop(day.key, stop.key, { departureTime: event.target.value })} />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Stop description
                      <Textarea rows={2} value={stop.description ?? ""}
                        onChange={(event) => changeStop(day.key, stop.key, { description: event.target.value })} />
                    </label>
                  </fieldset>
                ))}
                <Button type="button" variant="outline" onClick={() => {
                  const key = `new-${nextKey.current++}`;
                  const stop = { id: null, key, linkedToStay: false, name: "", description: null, arrivalTime: null, departureTime: null };
                  changeDay(day.key, (current) => ({ ...current, stops: [...current.stops, stop] }));
                }}>Add stop</Button>
              </fieldset>
            );
          })}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => {
              const key = `new-${nextKey.current++}`;
              changeDays((current) => [...current, { id: null, key, title: "", description: null, stops: [] }]);
            }}>Add day</Button>
            <Button type="submit">{saving ? "Saving…" : "Save itinerary"}</Button>
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </form>
    </section>
  );
}
