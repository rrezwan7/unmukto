"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RoomForm({ hotelId }: { hotelId: number }) {
  const router = useRouter();
  const [roomType, setRoomType] = useState("COUPLE");
  const [capacity, setCapacity] = useState("2");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function handleRoomTypeChange(type: string) {
    setRoomType(type);
    clearFeedback();
    if (type === "COUPLE") {
      setCapacity("2");
    } else if (type === "SHARED") {
      setCapacity("4");
    } else if (type === "PRIVATE") {
      setCapacity("3");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setSaving(true);
    clearFeedback();

    try {
      const response = await fetch(`/api/hotels/${hotelId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: data.get("roomNumber"),
          roomType,
          capacity: Number(capacity),
          description: data.get("description"),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to create room.");
      }

      form.reset();
      setRoomType("COUPLE");
      setCapacity("2");
      setMessage(`Room ${result.room.roomNumber} created.`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create room."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Room</CardTitle>
        <CardDescription>
          Add a physical room to this hotel. Specify the room type and maximum passenger capacity.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={save}
          onChange={clearFeedback}
          aria-busy={saving}
        >
          <fieldset
            disabled={saving}
            className="grid gap-5 sm:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="room-number">Room number / name</Label>
              <Input
                id="room-number"
                name="roomNumber"
                required
                maxLength={50}
                placeholder="Example: 101, 204B, Cottage 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-type">Room type</Label>
              <NativeSelect
                id="room-type"
                value={roomType}
                onChange={(e) => handleRoomTypeChange(e.target.value)}
                className="w-full"
              >
                <NativeSelectOption value="SHARED">
                  Shared Room
                </NativeSelectOption>
                <NativeSelectOption value="COUPLE">
                  Couple Room
                </NativeSelectOption>
                <NativeSelectOption value="PRIVATE">
                  Private / Family Room
                </NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-capacity">Bed / Passenger capacity</Label>
              <Input
                id="room-capacity"
                name="capacity"
                type="number"
                required
                min={1}
                max={20}
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  clearFeedback();
                }}
              />
            </div>

            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="room-description">Description / Features</Label>
              <Textarea
                id="room-description"
                name="description"
                maxLength={1000}
                placeholder="Bed sizes, attached balcony, view, or extra bed options"
              />
            </div>

            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add room"}
              </Button>
            </div>
          </fieldset>

          {message && (
            <p
              role="status"
              className="mt-4 text-sm font-medium text-green-700"
            >
              {message}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
