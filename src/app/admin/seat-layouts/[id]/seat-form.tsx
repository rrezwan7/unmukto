"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SeatForm({ layoutId }: { layoutId: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
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
    setSaving(true);

    try {
      const response = await fetch(`/api/seat-layouts/${layoutId}/seats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seats: [{
            seatNumber,
            rowNumber: Number(data.get("rowNumber")),
            columnNumber: Number(data.get("columnNumber")),
            isAvailable: enabled,
          }],
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to add seat.");
      }
      form.reset();
      setEnabled(true);
      setMessage(`Seat ${seatNumber} added.`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to add seat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Seat</CardTitle>
        <CardDescription>
          Add seats one at a time. Use unique seat numbers and positions. Leave columns empty for aisles.
          Changes apply to every vehicle using this layout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} onChange={clearFeedback} aria-busy={saving}>
          <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="seat-number">Seat number</Label>
              <Input id="seat-number" name="seatNumber" required maxLength={20} placeholder="Example: A1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seat-row">Row</Label>
              <Input id="seat-row" name="rowNumber" type="number" required min={1} max={100} step={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seat-column">Column</Label>
              <Input id="seat-column" name="columnNumber" type="number" required min={1} max={100} step={1} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-3">
              <Checkbox id="seat-enabled" checked={enabled} disabled={saving} onCheckedChange={(checked) => {
                setEnabled(checked);
                clearFeedback();
              }} />
              <Label htmlFor="seat-enabled">Enabled for passenger assignment</Label>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add seat"}</Button>
            </div>
          </fieldset>
          {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
