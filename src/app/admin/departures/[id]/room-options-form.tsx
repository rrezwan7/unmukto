"use client";

import { useEffect, useState, type FormEvent } from "react";

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
    <section className="mt-6 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Room Options</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Room surcharges apply once per booking. Save each option separately.
      </p>

      {loadError ? (
        <p role="alert" className="mt-4 text-red-700">
          {loadError} Refresh the page to try again.
        </p>
      ) : options === null ? (
        <p role="status" className="mt-4">
          Loading room options…
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
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
    </section>
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
  const [maxAdults, setMaxAdults] = useState(
    initialOption.maxAdults?.toString() ?? ""
  );
  const [maxChildren, setMaxChildren] = useState(
    initialOption.maxChildren?.toString() ?? ""
  );
  const [maxOccupants, setMaxOccupants] = useState(
    initialOption.maxOccupants?.toString() ?? ""
  );
  const [description, setDescription] = useState(
    initialOption.description ?? ""
  );
  const [available, setAvailable] = useState(initialOption.isAvailable);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const roomType = initialOption.roomType;
  const prefix = `room-${roomType.toLowerCase()}`;
  const inputClass = "mt-1 w-full rounded-md border px-3 py-2";

  function changed() {
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage("");
    setError("");

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
            maxAdults: limit(maxAdults),
            maxChildren: limit(maxChildren),
            maxOccupants: limit(maxOccupants),
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
    <form onSubmit={save} onChange={changed} className="rounded-lg border p-4">
      <h3 className="font-semibold">{roomLabels[roomType]} Room</h3>

      <fieldset disabled={saving} className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(event) => setAvailable(event.target.checked)}
          />
          Available for booking
        </label>

        <div>
          <label htmlFor={`${prefix}-surcharge`} className="text-sm">
            Surcharge per booking (৳)
          </label>
          <input
            id={`${prefix}-surcharge`}
            type="number"
            min="0"
            step="0.01"
            required
            value={surcharge}
            onChange={(event) => setSurcharge(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${prefix}-adults`} className="text-sm">
            Maximum adults
          </label>
          <input
            id={`${prefix}-adults`}
            type="number"
            min="1"
            max={roomType === "COUPLE" ? 2 : 2147483647}
            step="1"
            required={roomType === "COUPLE"}
            value={maxAdults}
            onChange={(event) => setMaxAdults(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${prefix}-children`} className="text-sm">
            Maximum children
          </label>
          <input
            id={`${prefix}-children`}
            type="number"
            min="0"
            max="2147483647"
            step="1"
            value={maxChildren}
            onChange={(event) => setMaxChildren(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${prefix}-occupants`} className="text-sm">
            Maximum total occupants
          </label>
          <input
            id={`${prefix}-occupants`}
            type="number"
            min="1"
            max="2147483647"
            step="1"
            value={maxOccupants}
            onChange={(event) => setMaxOccupants(event.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Includes adults, children, and infants. A blank limit adds no
            separate restriction.
          </p>
        </div>

        <div>
          <label htmlFor={`${prefix}-description`} className="text-sm">
            Description
          </label>
          <textarea
            id={`${prefix}-description`}
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${roomLabels[roomType]} room`}
        </button>
      </fieldset>

      {message && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}