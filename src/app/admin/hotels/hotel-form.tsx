"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HotelForm() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(true);
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

    setSaving(true);
    clearFeedback();

    try {
      const response = await fetch("/api/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          location: data.get("location"),
          address: data.get("address"),
          phone: data.get("phone"),
          description: data.get("description"),
          isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to create hotel.");
      }

      form.reset();
      setIsActive(true);
      setMessage("Hotel created.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create hotel."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Hotel</CardTitle>
        <CardDescription>
          Register a hotel partner and configure its rooms for tour stays.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={save}
          onChange={clearFeedback}
          aria-busy={saving}
        >
          <fieldset
            disabled={saving}
            className="grid gap-5 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="hotel-name">Hotel name</Label>
              <Input
                id="hotel-name"
                name="name"
                required
                maxLength={150}
                placeholder="Example: Hill View Resort"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-location">City / Location</Label>
              <Input
                id="hotel-location"
                name="location"
                required
                maxLength={150}
                placeholder="Example: Bandarban Sadar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-phone">Contact phone</Label>
              <Input
                id="hotel-phone"
                name="phone"
                type="tel"
                maxLength={50}
                placeholder="Example: +880 1700-000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel-address">Address</Label>
              <Input
                id="hotel-address"
                name="address"
                maxLength={500}
                placeholder="Street address or landmark"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="hotel-description">Description / Notes</Label>
              <Textarea
                id="hotel-description"
                name="description"
                maxLength={2000}
                placeholder="Amenities, check-in policies, or partner contract notes"
              />
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <Checkbox
                id="hotel-active"
                checked={isActive}
                disabled={saving}
                onCheckedChange={(checked) => {
                  setIsActive(Boolean(checked));
                  clearFeedback();
                }}
              />
              <Label htmlFor="hotel-active">
                Active for tour departure stays
              </Label>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save hotel"}
              </Button>
            </div>
          </fieldset>

          {message && (
            <p
              role="status"
              className="mt-4 text-sm font-medium text-green-700"
            >
              {message}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
