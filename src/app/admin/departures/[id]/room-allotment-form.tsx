"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type Room = {
  id: number;
  roomNumber: string;
  capacity: number;
  allotted: number;
  availableForAllotment: number;
  exclusive: boolean;
};

export default function RoomAllotmentForm({
  departureId, stayId, rooms, onSaved,
}: {
  departureId: number;
  stayId: number;
  rooms: Room[];
  onSaved: () => void;
}) {
  const [roomId, setRoomId] = useState("");
  const [places, setPlaces] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const room = rooms.find((room) => String(room.id) === roomId);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/departures/${departureId}/hotel-stays/${stayId}/room-allotments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          places: room.exclusive ? Number(!room.allotted) : Number(places),
          expectedPlaces: room.allotted,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to save the room allotment.");
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save the room allotment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} aria-busy={saving} className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Room allotments</h4>
        <p className="mt-1 text-xs text-muted-foreground">Reserve capacity for every night of this stay. Assigned passengers keep their places after an allotment is released.</p>
      </div>
      <fieldset disabled={saving} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`allotment-room-${stayId}`}>Room</Label>
          <NativeSelect id={`allotment-room-${stayId}`} value={roomId} required onChange={(event) => {
            const id = event.target.value;
            setRoomId(id);
            setPlaces(String(rooms.find((room) => String(room.id) === id)?.allotted ?? ""));
            setError("");
          }}>
            <NativeSelectOption value="">Choose a room</NativeSelectOption>
            {rooms.map((room) => <NativeSelectOption key={room.id} value={room.id}>Room {room.roomNumber}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        {room && !room.exclusive && (
          <div className="space-y-1">
            <Label htmlFor={`allotment-places-${stayId}`}>Places to reserve (0 releases)</Label>
            <Input id={`allotment-places-${stayId}`} type="number" min={0} max={room.capacity} step={1} required value={places}
              onChange={(event) => { setPlaces(event.target.value); setError(""); }} />
          </div>
        )}
        <Button type="submit" size="sm" disabled={saving || !room || (!room.exclusive && (places === "" || Number(places) === room.allotted))}>
          {saving ? "Saving…" : room?.exclusive ? (room.allotted ? "Release allotment" : "Reserve room") : "Save allotment"}
        </Button>
      </fieldset>
      {room && (
        <p className="text-xs text-muted-foreground">
          {room.exclusive
            ? room.availableForAllotment ? "This room is available for every night." : "Another stay uses this room on at least one night."
            : `${room.availableForAllotment} ${room.availableForAllotment === 1 ? "place is" : "places are"} available to this stay every night.`}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
