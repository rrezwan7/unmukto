"use client";

import { useEffect, useState } from "react";

type Seat = {
  id: number;
  seatNumber: string;
  rowNumber: number | null;
  columnNumber: number | null;
  status: "AVAILABLE" | "ASSIGNED" | "DISABLED";
};

type SeatData = {
  summary: {
    total: number;
    available: number;
    assigned: number;
    disabled: number;
  };
  seats: Seat[];
};

const seatStyles = {
  AVAILABLE: "border-green-600 bg-green-50 text-green-900",
  ASSIGNED: "border-blue-600 bg-blue-50 text-blue-900",
  DISABLED: "border-gray-400 bg-gray-100 text-gray-600",
};

const seatLabels = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  DISABLED: "Disabled",
};

export default function DepartureSeatMap({
  departureId,
  vehicleId,
}: {
  departureId: number;
  vehicleId: number;
}) {
  const [data, setData] = useState<SeatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/departures/${departureId}/vehicles/${vehicleId}/seats`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Unable to load seats.");
        }

        setData(result);
      } catch (error) {
        if (controller.signal.aborted) return;

        setData(null);
        setError(
          error instanceof Error ? error.message : "Unable to load seats."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [departureId, vehicleId, revision]);

  const positioned = (data?.seats ?? []).filter(
    (seat) =>
      seat.rowNumber !== null &&
      seat.columnNumber !== null &&
      seat.rowNumber >= 1 &&
      seat.columnNumber >= 1
  );

  const positionedIds = new Set(positioned.map((seat) => seat.id));
  const unpositioned = (data?.seats ?? []).filter(
    (seat) => !positionedIds.has(seat.id)
  );

  const columns = Math.max(
    1,
    ...positioned.map((seat) => seat.columnNumber!)
  );

  const rows = Math.max(
    1,
    ...positioned.map((seat) => seat.rowNumber!)
  );

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">Departure Seat Availability</h4>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh seats"}
        </button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Availability when last loaded. Seats are not reserved by viewing this map.
      </p>

      {loading && (
        <p role="status" className="mt-4 text-sm">
          Loading seats…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <>
          <p className="mt-3 text-sm">
            Total: {data.summary.total} · Available:{" "}
            {data.summary.available} · Assigned: {data.summary.assigned} ·
            Disabled: {data.summary.disabled}
          </p>

          {data.seats.length === 0 ? (
            <p className="mt-4 text-sm">No seats in this layout.</p>
          ) : (
            <div className="mt-4 overflow-auto rounded-lg border p-4">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 76px)`,
                  gridTemplateRows: `repeat(${rows}, 60px)`,
                  width: "max-content",
                  marginInline: "auto",
                }}
              >
                {positioned.map((seat) => (
                  <div
                    key={seat.id}
                    className={`flex flex-col items-center justify-center rounded-lg border ${seatStyles[seat.status]}`}
                    style={{
                      gridRowStart: seat.rowNumber!,
                      gridColumnStart: seat.columnNumber!,
                    }}
                  >
                    <span className="text-sm font-semibold">
                      {seat.seatNumber}
                    </span>
                    <span className="text-xs">
                      {seatLabels[seat.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unpositioned.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">Seats without positions</p>
              <ul className="mt-2 space-y-1 text-sm">
                {unpositioned.map((seat) => (
                  <li key={seat.id}>
                    {seat.seatNumber}: {seatLabels[seat.status]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}