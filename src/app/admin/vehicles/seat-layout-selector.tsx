"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

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
        error instanceof Error
          ? error.message
          : "Unable to assign layout."
      );
    } finally {
      setSaving(false);
    }
  }

  if (layouts.length === 0) {
    return (
      <span className="text-muted-foreground">
        No layouts created yet.
      </span>
    );
  }

  return (
    <div className="min-w-64 space-y-2">
      {currentLayoutId && (
        <Link
          href={`/admin/seat-layouts/${currentLayoutId}`}
          className="inline-block text-sm underline underline-offset-4"
        >
          View assigned seat map
        </Link>
      )}

      <form onSubmit={save} aria-busy={saving}>
        <fieldset disabled={saving} className="flex items-center gap-2">
          <Label htmlFor={`layout-${vehicleId}`} className="sr-only">
            Seat layout for vehicle {vehicleId}
          </Label>

          <NativeSelect
            id={`layout-${vehicleId}`}
            required
            disabled={saving}
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setMessage("");
              setError("");
            }}
            className="min-w-0 flex-1"
          >
            <NativeSelectOption value="" disabled>
              Choose layout
            </NativeSelectOption>

            {layouts.map((layout) => (
              <NativeSelectOption key={layout.id} value={layout.id}>
                {layout.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          <Button
            type="submit"
            variant="outline"
            disabled={!selected || saving}
          >
            {saving ? "Saving…" : "Assign"}
          </Button>
        </fieldset>
      </form>

      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}