"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export default function LodgingHoldSettings({ departureId, initialEnabled }: {
  departureId: number;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saved, setSaved] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/departures/${departureId}/lodging-holds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.enabled !== "boolean") {
        throw new Error(result.error ?? "Unable to save lodging hold settings.");
      }
      setSaved(result.enabled);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save lodging hold settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="my-6 rounded-lg border bg-card p-5" aria-labelledby="lodging-holds-heading">
      <h2 id="lodging-holds-heading" className="text-lg font-semibold">Checkout lodging holds</h2>
      <form onSubmit={save} className="mt-3 space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={enabled} disabled={saving}
            onChange={(event) => { setEnabled(event.target.checked); setError(""); }} />
          Hold allotted rooms alongside seats for new reservations
        </label>
        <p className="text-sm text-muted-foreground">
          Each scheduled stay needs an allotment for every published room option. Existing holds keep their original deadline.
        </p>
        <Button type="submit" disabled={saving || enabled === saved}>{saving ? "Saving…" : "Save lodging settings"}</Button>
        <p role="status" className="text-sm">Checkout lodging holds are {saved ? "enabled" : "disabled"}.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>
    </section>
  );
}
