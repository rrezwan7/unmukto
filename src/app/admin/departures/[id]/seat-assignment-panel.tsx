"use client";

import { useEffect, useState, type FormEvent } from "react";
import DepartureSeatMap from "./departure-seat-map";

type Passenger = {
  id: number;
  name: string;
  bookingNumber: string;
  eligibleForSeat: boolean;
  seatAssignment: {
    id: number;
    vehicleId: number;
    seatId: number;
  } | null;
};

type Seat = {
  id: number;
  seatNumber: string;
  status: "AVAILABLE" | "ASSIGNED" | "DISABLED";
};

async function readResponse(response: Response) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Unable to complete request.");
  }

  return result;
}

export default function SeatAssignmentPanel({
  departureId,
  vehicleId,
}: {
  departureId: number;
  vehicleId: number;
}) {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [passengerId, setPassengerId] = useState("");
  const [seatId, setSeatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const [passengerData, seatData] = await Promise.all([
          fetch(`/api/departures/${departureId}/passengers`, {
            signal: controller.signal,
            cache: "no-store",
          }).then(readResponse),
          fetch(
            `/api/departures/${departureId}/vehicles/${vehicleId}/seats`,
            {
              signal: controller.signal,
              cache: "no-store",
            }
          ).then(readResponse),
        ]);

        setPassengers(passengerData.passengers);
        setSeats(seatData.seats);
      } catch (error) {
        if (controller.signal.aborted) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load assignment options."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [departureId, vehicleId, revision]);

  const eligiblePassengers = passengers.filter(
    (passenger) =>
      passenger.eligibleForSeat && passenger.seatAssignment === null
  );

  const availableSeats = seats.filter(
    (seat) => seat.status === "AVAILABLE"
  );

  function refreshOptions() {
    setPassengerId("");
    setSeatId("");
    setError("");
    setRevision((value) => value + 1);
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || !passengerId || !seatId) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await fetch(`/api/departures/${departureId}/seat-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerId: Number(passengerId),
          vehicleId,
          seatId: Number(seatId),
        }),
      }).then(readResponse);

      setMessage("Seat assigned successfully.");
      refreshOptions();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to assign seat."
      );
    } finally {
      setSaving(false);
    }
  }

  const prefix = `assignment-${departureId}-${vehicleId}`;
  const inputClass = "mt-1 w-full rounded-md border px-3 py-2";

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">Assign a Seat</h4>
        <button
          type="button"
          disabled={loading || saving}
          onClick={() => {
            setMessage("");
            refreshOptions();
          }}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        >
          Refresh options
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-3 text-sm">
          Loading passengers and seats…
        </p>
      ) : loadError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {loadError} Use Refresh options to try again.
        </p>
      ) : eligiblePassengers.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No eligible passengers are waiting for a seat. Infants and
          passengers already assigned a seat are excluded.
        </p>
      ) : availableSeats.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This vehicle has no available seats.
        </p>
      ) : (
        <form onSubmit={assign} className="mt-3">
          <fieldset
            disabled={saving}
            className="grid gap-3 md:grid-cols-2"
          >
            <div>
              <label htmlFor={`${prefix}-passenger`} className="text-sm">
                Passenger
              </label>
              <select
                id={`${prefix}-passenger`}
                required
                value={passengerId}
                onChange={(event) => {
                  setPassengerId(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className={inputClass}
              >
                <option value="" disabled>Choose passenger</option>
                {eligiblePassengers.map((passenger) => (
                  <option key={passenger.id} value={passenger.id}>
                    {passenger.name} — {passenger.bookingNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${prefix}-seat`} className="text-sm">
                Available seat
              </label>
              <select
                id={`${prefix}-seat`}
                required
                value={seatId}
                onChange={(event) => {
                  setSeatId(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className={inputClass}
              >
                <option value="" disabled>Choose seat</option>
                {availableSeats.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seat.seatNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={!passengerId || !seatId || saving}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Assigning…" : "Assign seat"}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error} Refresh options before trying again.
        </p>
      )}

      <DepartureSeatMap
        key={revision}
        departureId={departureId}
        vehicleId={vehicleId}
      />
    </div>
  );
}