"use client";

import { useState, type FormEvent } from "react";

type Pricing = {
  adultFare: string;
  childFare: string;
  childFeeEnabled: boolean;
};

type Props = {
  departureId: number;
  initialPricing: Pricing | null;
};

export default function PricingForm({
  departureId,
  initialPricing,
}: Props) {
  const [adultFare, setAdultFare] = useState(
    initialPricing?.adultFare ?? ""
  );
  const [childFeeEnabled, setChildFeeEnabled] = useState(
    initialPricing?.childFeeEnabled ?? false
  );
  const [childFare, setChildFare] = useState(
    initialPricing?.childFare ?? "0"
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/departures/${departureId}/pricing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adultFare,
            childFeeEnabled,
            childFare: childFeeEnabled ? childFare : "0",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to save pricing.");
      }

      if (!childFeeEnabled) setChildFare("0");
      setMessage("Passenger pricing saved.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save pricing. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-md border px-3 py-2";

  return (
    <section className="mt-6 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Passenger Pricing</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Fares are in Bangladeshi taka. Infants travel free.
      </p>

      <form onSubmit={handleSubmit} className="mt-5">
        <fieldset disabled={saving} className="space-y-5">
          <div>
            <label htmlFor="adult-fare" className="text-sm font-medium">
              Adult fare (৳)
            </label>
            <input
              id="adult-fare"
              type="number"
              min="0"
              step="0.01"
              required
              value={adultFare}
              onChange={(event) => {
                setAdultFare(event.target.value);
                setMessage("");
              }}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={childFeeEnabled}
              onChange={(event) => {
                setChildFeeEnabled(event.target.checked);
                setMessage("");
              }}
            />
            <span className="text-sm font-medium">
              Charge a child fare, including a transport seat
            </span>
          </label>

          {childFeeEnabled ? (
            <div>
              <label
                htmlFor="child-fare"
                className="text-sm font-medium"
              >
                Child fare (৳)
              </label>
              <input
                id="child-fare"
                type="number"
                min="0"
                step="0.01"
                required
                value={childFare}
                onChange={(event) => {
                  setChildFare(event.target.value);
                  setMessage("");
                }}
                className={inputClass}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Children travel free without a separate transport seat.
            </p>
          )}

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save passenger pricing"}
          </button>
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