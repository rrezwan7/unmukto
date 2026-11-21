"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LayoutForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/seat-layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          description: data.get("description"),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to create seat layout.");
      }
      if (!Number.isSafeInteger(result.layout?.id) || result.layout.id <= 0) {
        throw new Error("The layout was created, but could not be opened. Reload the layout list.");
      }
      router.push(`/admin/seat-layouts/${result.layout.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create seat layout.");
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Seat Layout</CardTitle>
        <CardDescription>Create a reusable layout, then add its seats.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} onChange={() => setError("")} aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="layout-name">Layout name</Label>
              <Input id="layout-name" name="name" required maxLength={120} placeholder="Example: 40-seat coach" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="layout-description">Description (optional)</Label>
              <Textarea id="layout-description" name="description" maxLength={2000} rows={2} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create layout and add seats"}
            </Button>
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
