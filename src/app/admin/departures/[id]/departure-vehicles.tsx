"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import SeatAssignmentPanel from "./seat-assignment-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

type Vehicle = {
  id: number;
  name: string;
  registrationNumber: string | null;
  seatLayoutId: number | null;
  isActive: boolean;
};

type Allocation = {
  id: number;
  vehicleId: number;
  displayName: string | null;
  displayOrder: number;
  visibleToCustomer: boolean;
  vehicle: Vehicle | null;
};

async function readResponse(response: Response) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Unable to complete the request.");
  }

  return result;
}

export default function DepartureVehicles({
  departureId,
}: {
  departureId: number;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [visible, setVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [vehicleData, allocationData] = await Promise.all([
          fetch("/api/vehicles", {
            signal: controller.signal,
            cache: "no-store",
          }).then(readResponse),
          fetch(`/api/departures/${departureId}/vehicles`, {
            signal: controller.signal,
            cache: "no-store",
          }).then(readResponse),
        ]);

        setVehicles(vehicleData.vehicles);
        setAllocations(allocationData.vehicles);
      } catch (error) {
        if (controller.signal.aborted) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load vehicles."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [departureId]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function chooseVehicle(value: string) {
    setSelected(value);

    const existing = allocations.find(
      (allocation) => allocation.vehicleId === Number(value)
    );

    setDisplayName(existing?.displayName ?? "");
    setDisplayOrder(String(existing?.displayOrder ?? 0));
    setVisible(existing?.visibleToCustomer ?? false);
    clearFeedback();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected) return;

    setSaving(true);
    clearFeedback();

    let saved = false;

    try {
      await fetch(`/api/departures/${departureId}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: Number(selected),
          displayName: displayName.trim() || null,
          displayOrder: Number(displayOrder),
          visibleToCustomer: visible,
        }),
      }).then(readResponse);

      saved = true;

      const result = await fetch(
        `/api/departures/${departureId}/vehicles`,
        { cache: "no-store" }
      ).then(readResponse);

      setAllocations(result.vehicles);
      setMessage("Vehicle assignment saved.");
    } catch (error) {
      setError(
        saved
          ? "Assignment saved, but the list could not refresh. Reload this page."
          : error instanceof Error
            ? error.message
            : "Unable to assign vehicle."
      );
    } finally {
      setSaving(false);
    }
  }

  const eligibleVehicles = vehicles.filter(
    (vehicle) => vehicle.isActive && vehicle.seatLayoutId !== null
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Departure Vehicles</CardTitle>
          <Link
            href="/admin/vehicles"
            className="text-sm underline underline-offset-4"
          >
            Manage vehicles
          </Link>
        </div>
        <CardDescription>
          Assign vehicles and manage their display settings and passenger seats.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading vehicles…
          </p>
        ) : loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError} Refresh the page to try again.
          </p>
        ) : (
          <>
            {eligibleVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add an active vehicle and assign its seat layout first.
              </p>
            ) : (
              <form onSubmit={save} aria-busy={saving}>
                <fieldset
                  disabled={saving}
                  className="grid gap-5 md:grid-cols-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="departure-vehicle">Vehicle</Label>
                    <NativeSelect
                      id="departure-vehicle"
                      required
                      disabled={saving}
                      value={selected}
                      onChange={(event) =>
                        chooseVehicle(event.target.value)
                      }
                      className="w-full"
                    >
                      <NativeSelectOption value="" disabled>
                        Choose a vehicle
                      </NativeSelectOption>
                      {eligibleVehicles.map((vehicle) => (
                        <NativeSelectOption
                          key={vehicle.id}
                          value={vehicle.id}
                        >
                          {vehicle.name}
                          {vehicle.registrationNumber
                            ? ` — ${vehicle.registrationNumber}`
                            : ""}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-display-name">
                      Display name (optional)
                    </Label>
                    <Input
                      id="vehicle-display-name"
                      maxLength={120}
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value);
                        clearFeedback();
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle-display-order">
                      Display order
                    </Label>
                    <Input
                      id="vehicle-display-order"
                      type="number"
                      min="0"
                      max="2147483647"
                      step="1"
                      required
                      value={displayOrder}
                      onChange={(event) => {
                        setDisplayOrder(event.target.value);
                        clearFeedback();
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="vehicle-visible"
                      checked={visible}
                      disabled={saving}
                      onCheckedChange={(checked) => {
                        setVisible(checked);
                        clearFeedback();
                      }}
                    />
                    <Label htmlFor="vehicle-visible">
                      Visible to customers
                    </Label>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Button
                      type="submit"
                      disabled={!selected || saving}
                    >
                      {saving ? "Saving…" : "Save vehicle assignment"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Select an assigned vehicle to edit its display settings.
                      Hiding a vehicle does not remove its assignment.
                    </p>
                  </div>
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
            )}

            <div className="mt-8 space-y-5">
              <h3 className="font-semibold">Assigned Vehicles</h3>

              {allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vehicles assigned to this departure.
                </p>
              ) : (
                allocations.map((allocation) => (
                  <Card key={allocation.id} className="shadow-none">
                    <CardHeader>
                      <CardTitle>
                        {allocation.displayName ||
                          allocation.vehicle?.name ||
                          `Vehicle #${allocation.vehicleId}`}
                      </CardTitle>
                      <CardDescription>
                        {allocation.vehicle?.name} · Order{" "}
                        {allocation.displayOrder} ·{" "}
                        {allocation.visibleToCustomer
                          ? "Visible to customers"
                          : "Hidden from customers"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {allocation.vehicle?.seatLayoutId && (
                        <Link
                          href={`/admin/seat-layouts/${allocation.vehicle.seatLayoutId}`}
                          className="text-sm underline underline-offset-4"
                        >
                          View seat layout
                        </Link>
                      )}

                      <SeatAssignmentPanel
                        departureId={departureId}
                        vehicleId={allocation.vehicleId}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}