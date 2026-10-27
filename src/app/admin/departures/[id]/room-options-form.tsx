"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RoomType = "SHARED" | "COUPLE" | "PRIVATE";

type RoomOption = {
  roomType: RoomType;
  surcharge: string;
  maxAdults: number | null;
  maxChildren: number | null;
  maxOccupants: number | null;
  description: string | null;
  isAvailable: boolean;
  displayOrder: number;
};

const roomTypes: RoomType[] = ["SHARED", "COUPLE", "PRIVATE"];

const roomLabels = {
  SHARED: "Shared",
  COUPLE: "Couple",
  PRIVATE: "Private",
};

export default function RoomOptionsForm({
  departureId,
}: {
  departureId: number;
}) {
  const [options, setOptions] = useState<RoomOption[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `/api/departures/${departureId}/room-options`,
          { signal: controller.signal, cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Unable to load room options.");
        }

        setOptions(result.roomOptions);
      } catch (error) {
        if (controller.signal.aborted) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load room options."
        );
      }
    }

    void load();
    return () => controller.abort();
  }, [departureId]);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Room Options</CardTitle>
        <CardDescription>
          Surcharges apply once per booking. Save each option separately.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError} Refresh the page to try again.
          </p>
        ) : options === null ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading room options…
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {roomTypes.map((roomType, index) => (
              <RoomOptionForm
                key={`${departureId}-${roomType}`}
                departureId={departureId}
                initialOption={
                  options.find((option) => option.roomType === roomType) ?? {
                    roomType,
                    surcharge: "0",
                    maxAdults: roomType === "COUPLE" ? 2 : null,
                    maxChildren: null,
                    maxOccupants: null,
                    description: "",
                    isAvailable: false,
                    displayOrder: index,
                  }
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomOptionForm({
  departureId,
  initialOption,
}: {
  departureId: number;
  initialOption: RoomOption;
}) {
  const [surcharge, setSurcharge] = useState(initialOption.surcharge);
  const [limits, setLimits] = useState({
    maxAdults: initialOption.maxAdults?.toString() ?? "",
    maxChildren: initialOption.maxChildren?.toString() ?? "",
    maxOccupants: initialOption.maxOccupants?.toString() ?? "",
  });
  const [description, setDescription] = useState(
    initialOption.description ?? ""
  );
  const [available, setAvailable] = useState(initialOption.isAvailable);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const roomType = initialOption.roomType;
  const prefix = `room-${roomType.toLowerCase()}`;

  const capacityFields = [
    { key: "maxAdults", label: "Maximum adults", min: 1 },
    { key: "maxChildren", label: "Maximum children", min: 0 },
    { key: "maxOccupants", label: "Maximum total occupants", min: 1 },
  ] as const;

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    clearFeedback();

    const limit = (value: string) =>
      value === "" ? null : Number(value);

    try {
      const response = await fetch(
        `/api/departures/${departureId}/room-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomType,
            surcharge,
            maxAdults: limit(limits.maxAdults),
            maxChildren: limit(limits.maxChildren),
            maxOccupants: limit(limits.maxOccupants),
            description: description.trim() || null,
            isAvailable: available,
            displayOrder: initialOption.displayOrder,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to save room option.");
      }

      setMessage(`${roomLabels[roomType]} room saved.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save room option."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{roomLabels[roomType]} Room</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={save} aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-5">
            <div className="flex items-center gap-3">
              <Checkbox
                id={`${prefix}-available`}
                checked={available}
                disabled={saving}
                onCheckedChange={(checked) => {
                  setAvailable(checked);
                  clearFeedback();
                }}
              />
              <Label htmlFor={`${prefix}-available`}>
                Available for booking
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${prefix}-surcharge`}>
                Surcharge per booking (৳)
              </Label>
              <Input
                id={`${prefix}-surcharge`}
                type="number"
                min="0"
                step="0.01"
                required
                value={surcharge}
                onChange={(event) => {
                  setSurcharge(event.target.value);
                  clearFeedback();
                }}
              />
            </div>

            {capacityFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`${prefix}-${field.key}`}>
                  {field.label}
                </Label>
                <Input
                  id={`${prefix}-${field.key}`}
                  type="number"
                  min={field.min}
                  max={
                    field.key === "maxAdults" && roomType === "COUPLE"
                      ? 2
                      : 2147483647
                  }
                  step="1"
                  required={
                    field.key === "maxAdults" && roomType === "COUPLE"
                  }
                  value={limits[field.key]}
                  onChange={(event) => {
                    setLimits({
                      ...limits,
                      [field.key]: event.target.value,
                    });
                    clearFeedback();
                  }}
                  aria-describedby={`${prefix}-capacity-help`}
                />
              </div>
            ))}

            <p
              id={`${prefix}-capacity-help`}
              className="text-xs text-muted-foreground"
            >
              Total occupants includes adults, children, and infants.
              A blank limit adds no separate restriction.
            </p>

            <div className="space-y-2">
              <Label htmlFor={`${prefix}-description`}>Description</Label>
              <Textarea
                id={`${prefix}-description`}
                maxLength={2000}
                rows={3}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFeedback();
                }}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : `Save ${roomLabels[roomType]} room`}
            </Button>
          </fieldset>

          {message && (
            <p role="status" className="mt-4 text-sm text-green-700">
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