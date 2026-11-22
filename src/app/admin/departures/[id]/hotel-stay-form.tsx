"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type StayHotel = { id: number; name: string; location: string; isActive: boolean };
export type StayStop = { id: number; name: string; dayNumber: number };
export type EditableStay = {
  id: number;
  hotelId: number;
  destinationId: number | null;
  checkInDay: string;
  checkOutDay: string;
  assignmentCount: number;
  allotmentCount: number;
  updatedAt: string;
};

export default function HotelStayForm({
  departureId, hotels, stops, stay, onSaved, onCancel,
}: {
  departureId: number;
  hotels: StayHotel[];
  stops: StayStop[];
  stay?: EditableStay;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [hotelId, setHotelId] = useState(stay ? String(stay.hotelId) : "");
  const [destinationId, setDestinationId] = useState(String(stay?.destinationId ?? ""));
  const [checkInDate, setCheckInDate] = useState(stay?.checkInDay ?? "");
  const [checkOutDate, setCheckOutDate] = useState(stay?.checkOutDay ?? "");
  const [expectedUpdatedAt] = useState(stay?.updatedAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasAssignments = Boolean(stay?.assignmentCount);
  const locked = hasAssignments || Boolean(stay?.allotmentCount);
  const prefix = stay ? `edit-stay-${stay.id}` : "new-stay";
  const choices = hotels.filter((hotel) => hotel.isActive || hotel.id === stay?.hotelId);
  const hasLinkedStop = Boolean(stay?.destinationId && !stops.some((stop) => stop.id === stay.destinationId));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hotelId || saving) return;

    setSaving(true);
    setError("");
    const actionError = stay ? "Unable to save hotel stay." : "Unable to schedule hotel stay.";
    try {
      const url = `/api/departures/${departureId}/hotel-stays`;
      const response = await fetch(stay ? `${url}/${stay.id}` : url, {
        method: stay ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: Number(hotelId),
          destinationId: destinationId ? Number(destinationId) : null,
          checkInDate,
          checkOutDate,
          expectedUpdatedAt,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? actionError);

      if (!stay) {
        setHotelId("");
        setDestinationId("");
        setCheckInDate("");
        setCheckOutDate("");
      }
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : actionError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} onChange={() => setError("")} aria-busy={saving}>
      {locked && (
        <p className="mb-3 text-sm text-muted-foreground">
          {hasAssignments ? "Room assignments lock the hotel and dates." : "Release room allotments before changing the hotel or dates."}
        </p>
      )}
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${prefix}-hotel`}>Partner Hotel</Label>
          {choices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Link href="/admin/hotels" className="underline">Register or activate a hotel</Link> to schedule a stay.
            </p>
          ) : (
            <NativeSelect
              id={`${prefix}-hotel`}
              required
              disabled={locked}
              value={hotelId}
              onChange={(event) => setHotelId(event.target.value)}
              className="w-full"
            >
              <NativeSelectOption value="">Choose a hotel…</NativeSelectOption>
              {choices.map((hotel) => (
                <NativeSelectOption key={hotel.id} value={hotel.id}>
                  {hotel.name} ({hotel.location}){hotel.isActive ? "" : " · Inactive"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-checkin`}>Check-in Date</Label>
          <Input id={`${prefix}-checkin`} type="date" required disabled={locked}
            value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-checkout`}>Check-out Date</Label>
          <Input id={`${prefix}-checkout`} type="date" required disabled={locked}
            value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} />
        </div>
        {(stops.length > 0 || hasLinkedStop) && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`${prefix}-stop`}>Itinerary Stop (optional)</Label>
            <NativeSelect id={`${prefix}-stop`} value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)} className="w-full">
              <NativeSelectOption value="">No itinerary stop</NativeSelectOption>
              {hasLinkedStop && <NativeSelectOption value={stay?.destinationId ?? ""}>Existing linked stop</NativeSelectOption>}
              {stops.map((stop) => (
                <NativeSelectOption key={stop.id} value={stop.id}>Day {stop.dayNumber} · {stop.name}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-4">
          <Button type="submit" disabled={saving || !hotelId}>
            {saving ? "Saving…" : stay ? "Save Stay" : "Schedule Hotel Stay"}
          </Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </form>
  );
}
