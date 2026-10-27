"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

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

  function chooseVehicle(value: string) {
    setSelected(value);

    const existing = allocations.find(
      (allocation) => allocation.vehicleId === Number(value)
    );

    setDisplayName(existing?.displayName ?? "");
    setDisplayOrder(String(existing?.displayOrder ?? 0));
    setVisible(existing?.visibleToCustomer ?? false);
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected) return;

    setSaving(true);
    setMessage("");
    setError("");

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

  const inputClass = "mt-1 w-full rounded-md border px-3 py-2";

  return (
    <section className="mt-6 rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Departure Vehicles</h2>
        <Link href="/admin/vehicles" className="text-sm underline">
          Manage vehicles
        </Link>
      </div>

      {loading ? (
        <p role="status" className="mt-4">Loading vehicles…</p>
      ) : loadError ? (
        <p role="alert" className="mt-4 text-red-700">
          {loadError} Refresh the page to try again.
        </p>
      ) : (
        <>
          {eligibleVehicles.length === 0 ? (
            <p className="mt-4 text-muted-foreground">
              Add an active vehicle and assign its seat layout first.
            </p>
          ) : (
            <form onSubmit={save} className="mt-5">
              <fieldset
                disabled={saving}
                className="grid gap-4 md:grid-cols-2"
              >
                <div>
                  <label htmlFor="departure-vehicle">Vehicle</label>
                  <select
                    id="departure-vehicle"
                    required
                    value={selected}
                    onChange={(event) => chooseVehicle(event.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>Choose a vehicle</option>
                    {eligibleVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                        {vehicle.registrationNumber
                          ? ` — ${vehicle.registrationNumber}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="vehicle-display-name">
                    Display name (optional)
                  </label>
                  <input
                    id="vehicle-display-name"
                    maxLength={120}
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setMessage("");
                    }}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-display-order">Display order</label>
                  <input
                    id="vehicle-display-order"
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    required
                    value={displayOrder}
                    onChange={(event) => {
                      setDisplayOrder(event.target.value);
                      setMessage("");
                    }}
                    className={inputClass}
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(event) => {
                      setVisible(event.target.checked);
                      setMessage("");
                    }}
                  />
                  Visible to customers
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={!selected || saving}
                    className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save vehicle assignment"}
                  </button>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selecting an assigned vehicle lets you update its display
                    settings. Hiding it does not remove its assignment.
                  </p>
                </div>
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
          )}

          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">Assigned Vehicles</h3>

            {allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No vehicles assigned to this departure.
              </p>
            ) : (
              allocations.map((allocation) => (
                <div key={allocation.id} className="rounded-md border p-4">
                  <p className="font-medium">
                    {allocation.displayName ||
                      allocation.vehicle?.name ||
                      `Vehicle #${allocation.vehicleId}`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {allocation.vehicle?.name} · Order{" "}
                    {allocation.displayOrder} ·{" "}
                    {allocation.visibleToCustomer
                      ? "Visible to customers"
                      : "Hidden from customers"}
                  </p>
                  {allocation.vehicle?.seatLayoutId && (
                    <Link
                      href={`/admin/seat-layouts/${allocation.vehicle.seatLayoutId}`}
                      className="mt-2 inline-block text-sm underline"
                    >
                      View seat layout
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}