"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Vehicle = {
  id: number;
  name: string;
  type: string;
  registrationNumber: string | null;
  description: string | null;
  isActive: boolean;
  updatedAt: string;
};

export default function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(vehicle?.isActive ?? true);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(vehicle?.updatedAt);
  const actionError = vehicle ? "Unable to update vehicle." : "Unable to create vehicle.";
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
      const response = await fetch(vehicle ? `/api/vehicles/${vehicle.id}` : "/api/vehicles", {
        method: vehicle ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          type: data.get("type"),
          registrationNumber: data.get("registrationNumber"),
          description: data.get("description"),
          isActive,
          expectedUpdatedAt,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? actionError);
      }

      if (vehicle) {
        setExpectedUpdatedAt(result.vehicle.updatedAt);
        setMessage("Vehicle saved.");
      } else {
        form.reset();
        setIsActive(true);
        setMessage("Vehicle created.");
      }
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : actionError
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</CardTitle>
        <CardDescription>
          {vehicle
            ? "Inactive vehicles are hidden from customers and cannot receive new seat assignments."
            : "Create a vehicle, then assign its seat layout from the list below."}
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
              <Label htmlFor="vehicle-name">Vehicle name</Label>
              <Input
                id="vehicle-name"
                name="name"
                defaultValue={vehicle?.name}
                required
                maxLength={120}
                placeholder="Example: Dhaka Tour Bus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Vehicle type</Label>
              <NativeSelect
                id="vehicle-type"
                name="type"
                defaultValue={vehicle?.type ?? "BUS"}
                className="w-full"
              >
                <NativeSelectOption value="BUS">Bus</NativeSelectOption>
                <NativeSelectOption value="COACH">Coach</NativeSelectOption>
                <NativeSelectOption value="MICROBUS">
                  Microbus
                </NativeSelectOption>
                <NativeSelectOption value="MINIBUS">
                  Minibus
                </NativeSelectOption>
                <NativeSelectOption value="OTHER">Other</NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-registration">
                Registration number (optional)
              </Label>
              <Input
                id="vehicle-registration"
                name="registrationNumber"
                defaultValue={vehicle?.registrationNumber ?? ""}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-description">
                Description (optional)
              </Label>
              <Textarea
                id="vehicle-description"
                name="description"
                defaultValue={vehicle?.description ?? ""}
                maxLength={2000}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="vehicle-active"
                checked={isActive}
                disabled={saving}
                onCheckedChange={(checked) => {
                  setIsActive(checked);
                  clearFeedback();
                }}
              />
              <Label htmlFor="vehicle-active">Active vehicle</Label>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : vehicle ? "Save vehicle" : "Create vehicle"}
              </Button>
            </div>
          </fieldset>

          {message && (
            <p role="status" className="mt-4 text-sm text-green-700">
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