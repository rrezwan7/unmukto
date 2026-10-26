"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function VehicleForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          type: data.get("type"),
          registrationNumber: data.get("registrationNumber"),
          description: data.get("description"),
          isActive: data.get("isActive") === "on",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to create vehicle.");
      }

      form.reset();
      setMessage("Vehicle created.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create vehicle."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-md border px-3 py-2";

  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Add Vehicle</h2>

      <form onSubmit={save} className="mt-4">
        <fieldset disabled={saving} className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="vehicle-name">Vehicle name</label>
            <input
              id="vehicle-name"
              name="name"
              required
              maxLength={120}
              placeholder="Example: Dhaka Tour Bus"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="vehicle-type">Vehicle type</label>
            <select
              id="vehicle-type"
              name="type"
              defaultValue="BUS"
              className={inputClass}
            >
              <option value="BUS">Bus</option>
              <option value="COACH">Coach</option>
              <option value="MICROBUS">Microbus</option>
              <option value="MINIBUS">Minibus</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="vehicle-registration">
              Registration number (optional)
            </label>
            <input
              id="vehicle-registration"
              name="registrationNumber"
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="vehicle-description">
              Description (optional)
            </label>
            <textarea
              id="vehicle-description"
              name="description"
              maxLength={2000}
              rows={2}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2">
            <input name="isActive" type="checkbox" defaultChecked />
            Active vehicle
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create vehicle"}
            </button>
          </div>
        </fieldset>

        {message && (
          <p role="status" className="mt-3 text-sm text-green-700">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}