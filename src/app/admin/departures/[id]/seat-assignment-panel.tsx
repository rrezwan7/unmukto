"use client";

import { useEffect, useState, type FormEvent } from "react";
import DepartureSeatMap from "./departure-seat-map";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || !passengerId || !seatId) return;

    setSaving(true);
    clearFeedback();

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
        error instanceof Error
          ? error.message
          : "Unable to assign seat."
      );
    } finally {
      setSaving(false);
    }
  }

  const prefix = `assignment-${departureId}-${vehicleId}`;

  return (
    <Card className="mt-4 shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Assign a Seat</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || saving}
            onClick={() => {
              setMessage("");
              refreshOptions();
            }}
          >
            {loading ? "Loading…" : "Refresh options"}
          </Button>
        </div>

        <CardDescription>
          Select an eligible passenger and an available seat for this vehicle.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading passengers and seats…
          </p>
        ) : loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError} Use Refresh options to try again.
          </p>
        ) : eligiblePassengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No eligible passengers are waiting for a seat. Infants and
            passengers already assigned a seat are excluded.
          </p>
        ) : availableSeats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This vehicle has no available seats.
          </p>
        ) : (
          <form onSubmit={assign} aria-busy={saving}>
            <fieldset
              disabled={saving}
              className="grid gap-5 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-passenger`}>Passenger</Label>
                <NativeSelect
                  id={`${prefix}-passenger`}
                  required
                  disabled={saving}
                  value={passengerId}
                  onChange={(event) => {
                    setPassengerId(event.target.value);
                    clearFeedback();
                  }}
                  className="w-full"
                >
                  <NativeSelectOption value="" disabled>
                    Choose passenger
                  </NativeSelectOption>

                  {eligiblePassengers.map((passenger) => (
                    <NativeSelectOption
                      key={passenger.id}
                      value={passenger.id}
                    >
                      {passenger.name} — {passenger.bookingNumber}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${prefix}-seat`}>Available seat</Label>
                <NativeSelect
                  id={`${prefix}-seat`}
                  required
                  disabled={saving}
                  value={seatId}
                  onChange={(event) => {
                    setSeatId(event.target.value);
                    clearFeedback();
                  }}
                  className="w-full"
                >
                  <NativeSelectOption value="" disabled>
                    Choose seat
                  </NativeSelectOption>

                  {availableSeats.map((seat) => (
                    <NativeSelectOption key={seat.id} value={seat.id}>
                      {seat.seatNumber}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={!passengerId || !seatId || saving}
                >
                  {saving ? "Assigning…" : "Assign seat"}
                </Button>
              </div>
            </fieldset>
          </form>
        )}

        {message && (
          <p role="status" className="mt-4 text-sm text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error} Refresh options before trying again.
          </p>
        )}

        <DepartureSeatMap
          key={revision}
          departureId={departureId}
          vehicleId={vehicleId}
        />
      </CardContent>
    </Card>
  );
}