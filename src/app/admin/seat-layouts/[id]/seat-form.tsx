"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type EditableSeat = {
  id: number;
  seatNumber: string;
  rowNumber: number | null;
  columnNumber: number | null;
  isAvailable: boolean;
  updatedAt: string;
};

export default function SeatForm({
  layoutId, seat, vehicleCount,
}: { layoutId: number; seat?: EditableSeat; vehicleCount: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(seat?.isAvailable ?? true);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(seat?.updatedAt);
  const [confirmed, setConfirmed] = useState(false);
  const sharedLayout = vehicleCount > 1;
  const actionError = seat ? "Unable to save seat." : "Unable to add seat.";
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const seatNumber = String(data.get("seatNumber") ?? "").trim().toUpperCase();
    clearFeedback();
    if (!seatNumber) {
      setError("Provide a seat number of 1–20 characters.");
      return;
    }
    if (sharedLayout && !confirmed) return;
    const row = data.get("rowNumber");
    const column = data.get("columnNumber");
    const values = {
      seatNumber,
      rowNumber: row ? Number(row) : null,
      columnNumber: column ? Number(column) : null,
      isAvailable: enabled,
    };
    const confirmedVehicleCount = confirmed ? vehicleCount : undefined;
    setSaving(true);

    try {
      const response = await fetch(`/api/seat-layouts/${layoutId}/seats`, {
        method: seat ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seat ? {
          ...values,
          seatId: seat.id,
          expectedUpdatedAt,
          confirmedVehicleCount,
        } : { seats: [values], confirmedVehicleCount }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error ?? actionError);

      setConfirmed(false);
      if (seat) {
        setExpectedUpdatedAt(result.seat.updatedAt);
        setMessage(`Seat ${seatNumber} saved.`);
      } else {
        form.reset();
        setEnabled(true);
        setMessage(`Seat ${seatNumber} added.`);
      }
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : actionError);
    } finally {
      setSaving(false);
    }
  }

  const prefix = seat ? `edit-seat-${seat.id}` : "new-seat";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{seat ? `Edit Seat ${seat.seatNumber}` : "Add Seat"}</CardTitle>
        <CardDescription>
          {seat
            ? "Use a unique seat number and position. Clear both row and column to remove the position."
            : "Use unique seat numbers and positions. Skip a column to leave room for an aisle."}
          {vehicleCount === 1 && " Changes also apply to the vehicle using this layout."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} onChange={clearFeedback} aria-busy={saving}>
          <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-number`}>Seat number</Label>
              <Input id={`${prefix}-number`} name="seatNumber" defaultValue={seat?.seatNumber} required maxLength={20} placeholder="Example: A1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-row`}>Row</Label>
              <Input id={`${prefix}-row`} name="rowNumber" type="number" defaultValue={seat?.rowNumber ?? ""} required={!seat} min={1} max={100} step={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-column`}>Column</Label>
              <Input id={`${prefix}-column`} name="columnNumber" type="number" defaultValue={seat?.columnNumber ?? ""} required={!seat} min={1} max={100} step={1} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-3">
              <Checkbox id={`${prefix}-enabled`} checked={enabled} disabled={saving} onCheckedChange={(checked) => {
                setEnabled(checked);
                clearFeedback();
              }} />
              <Label htmlFor={`${prefix}-enabled`}>Enabled for passenger assignment</Label>
            </div>
            {sharedLayout && (
              <div className="flex items-center gap-3 sm:col-span-3">
                <Checkbox id={`${prefix}-shared`} checked={confirmed} disabled={saving} onCheckedChange={(checked) => {
                  setConfirmed(checked);
                  clearFeedback();
                }} />
                <Label htmlFor={`${prefix}-shared`}>Apply this change to all {vehicleCount} vehicles</Label>
              </div>
            )}
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving || (sharedLayout && !confirmed)}>
                {saving ? "Saving…" : seat ? "Save seat" : "Add seat"}
              </Button>
            </div>
          </fieldset>
          {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
