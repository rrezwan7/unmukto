"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type EditableTour = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  isActive: boolean;
  updatedAt: string;
};

export default function TourDetailsForm({ initialTour }: { initialTour: EditableTour }) {
  const [tour, setTour] = useState(initialTour);
  const [savedTour, setSavedTour] = useState(initialTour);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tour.title,
          description: tour.description,
          coverImage: tour.coverImage,
          isActive: tour.isActive,
          expectedUpdatedAt: savedTour.updatedAt,
        }),
      });
      const result = await response.json() as { tour?: EditableTour; error?: string };
      if (!response.ok || !result.tour) throw new Error(result.error ?? "Could not save the tour.");
      setTour(result.tour);
      setSavedTour(result.tour);
      setMessage("Tour saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the tour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="tour-details" className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tour-details" className="text-lg font-semibold">Tour details</h2>
        {savedTour.isActive && <Link href={`/tours/${encodeURIComponent(savedTour.slug)}`} className="text-sm underline underline-offset-4">View public tour</Link>}
      </div>
      <form onSubmit={save} onChange={() => setMessage("")}>
        <fieldset disabled={saving} className="space-y-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Tour title
            <Input required value={tour.title} onChange={(event) => setTour({ ...tour, title: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Description
            <Textarea rows={4} value={tour.description ?? ""} onChange={(event) => setTour({ ...tour, description: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Cover image
            <Input placeholder="https://… or /images/…" value={tour.coverImage ?? ""} onChange={(event) => setTour({ ...tour, coverImage: event.target.value })} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 text-sm">
              <span className="font-medium">Public URL</span>
              <p className="wrap-anywhere text-muted-foreground">/tours/{tour.slug}</p>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Publication status
              <NativeSelect className="w-full" value={tour.isActive ? "published" : "archived"}
                onChange={(event) => setTour({ ...tour, isActive: event.target.value === "published" })}>
                <NativeSelectOption value="published">Published</NativeSelectOption>
                <NativeSelectOption value="archived">Archived</NativeSelectOption>
              </NativeSelect>
              <span className="font-normal text-muted-foreground">Archived tours are hidden from visitors and can be published again.</span>
            </label>
          </div>
          <Button type="submit">{saving ? "Saving…" : "Save tour details"}</Button>
        </fieldset>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </form>
    </section>
  );
}
