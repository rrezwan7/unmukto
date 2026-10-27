"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  vehicleId: number;
  currentLayoutId: number | null;
  layouts: { id: number; name: string }[];
};

export default function SeatLayoutSelector({
  vehicleId,
  currentLayoutId,
  layouts,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    currentLayoutId?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/seat-layout`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seatLayoutId: Number(selected),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to assign layout.");
      }

      setMessage("Layout assigned.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to assign layout."
      );
    } finally {
      setSaving(false);
    }
  }

  if (layouts.length === 0) {
    return <span>No layouts created yet.</span>;
  }

  return (
    <div className="min-w-56 space-y-2">
      {currentLayoutId && (
        <Link
          href={`/admin/seat-layouts/${currentLayoutId}`}
          className="inline-block underline"
        >
          View assigned seat map
        </Link>
      )}

      <form onSubmit={save}>
        <fieldset disabled={saving} className="flex items-center gap-2">
          <label htmlFor={`layout-${vehicleId}`} className="sr-only">
            Seat layout for vehicle {vehicleId}
          </label>

          <select
            id={`layout-${vehicleId}`}
            required
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setMessage("");
              setError("");
            }}
            className="min-w-0 flex-1 rounded-md border px-2 py-2"
          >
            <option value="" disabled>
              Choose layout
            </option>
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!selected || saving}
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Assign"}
          </button>
        </fieldset>
      </form>

      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}