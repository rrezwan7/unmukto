"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScheduleFields } from "@/lib/departure-schedule";

const scheduleInputs = [
  { name: "departureDate", label: "Departure date", type: "date", required: true },
  { name: "departureTime", label: "Departure time", type: "time" },
  { name: "returnDate", label: "Return date", type: "date" },
  { name: "returnTime", label: "Return time", type: "time" },
] as const;

export default function DepartureSettingsForm({ id, initialSchedule, initialUpdatedAt, initialVisible, initialOpen, hasHistory }: {
  id: number;
  initialSchedule: ScheduleFields;
  initialUpdatedAt: string;
  initialVisible: boolean;
  initialOpen: boolean;
  hasHistory: boolean;
}) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [savedSchedule, setSavedSchedule] = useState(initialSchedule);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [customerVisible, setCustomerVisible] = useState(initialVisible);
  const [bookingOpen, setBookingOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    setError("");

    const scheduleChanged = scheduleInputs.some(({ name }) => schedule[name] !== savedSchedule[name]);
    try {
      const response = await fetch(`/api/departures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerVisible, bookingOpen, expectedUpdatedAt: updatedAt, schedule: scheduleChanged ? schedule : undefined }),
      });
      const result = await response.json() as { departure?: { updatedAt: string }; error?: string };
      if (!response.ok || !result.departure) throw new Error(result.error ?? "Could not save the departure.");
      setUpdatedAt(result.departure.updatedAt);
      setSavedSchedule(schedule);
      setMessage("Departure saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the departure.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="departure-settings" aria-labelledby="departure-settings-heading" className="scroll-mt-4 rounded-lg border bg-card p-5">
      <h2 id="departure-settings-heading" className="mb-4 text-lg font-semibold">Edit departure</h2>
      <form onSubmit={save} onChange={() => setMessage("")}>
        <fieldset disabled={saving} className="space-y-4">
          <fieldset disabled={hasHistory} className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">Schedule (Bangladesh time)</legend>
            {scheduleInputs.map(({ name, label, type, ...attributes }) => (
              <label key={name} className="grid gap-1.5 text-sm">
                {label}
                <Input
                  type={type}
                  {...attributes}
                  value={schedule[name]}
                  onChange={(event) => setSchedule({ ...schedule, [name]: event.target.value })}
                />
              </label>
            ))}
          </fieldset>
          {hasHistory ? (
            <p className="text-sm text-muted-foreground">Booking or assignment history locks the schedule.</p>
          ) : (
            <p className="text-sm text-muted-foreground">For vehicle scheduling, a blank return time uses the end of the return day, or the end of the departure day if no return date is set.</p>
          )}
          <div className="grid gap-3 border-t pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={customerVisible} onChange={(event) => setCustomerVisible(event.target.checked)} className="size-4" />
              Show this departure to customers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bookingOpen} onChange={(event) => setBookingOpen(event.target.checked)} className="size-4" />
              Accept new bookings
            </label>
            <p className="text-sm text-muted-foreground">Customers can book only when both options are enabled.</p>
          </div>
          <Button type="submit">{saving ? "Saving…" : "Save departure"}</Button>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </form>
    </section>
  );
}
