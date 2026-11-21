"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    clearFeedback();

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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Passenger Pricing</CardTitle>
        <CardDescription>
          Fares are in Bangladeshi taka. Infants travel free.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-6">
            <div className="max-w-sm space-y-2">
              <Label htmlFor="adult-fare">Adult fare (৳)</Label>
              <Input
                id="adult-fare"
                type="number"
                min="0"
                step="0.01"
                required
                value={adultFare}
                onChange={(event) => {
                  setAdultFare(event.target.value);
                  clearFeedback();
                }}
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="child-fee-enabled"
                checked={childFeeEnabled}
                disabled={saving}
                onCheckedChange={(checked) => {
                  setChildFeeEnabled(checked);
                  clearFeedback();
                }}
                aria-describedby="child-pricing-help"
              />

              <div className="space-y-1">
                <Label htmlFor="child-fee-enabled">
                  Charge a child fare
                </Label>
                <p
                  id="child-pricing-help"
                  className="text-sm text-muted-foreground"
                >
                  {childFeeEnabled
                    ? "The child fare includes a transport seat."
                    : "Children travel free without a separate transport seat."}
                </p>
              </div>
            </div>

            {childFeeEnabled && (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="child-fare">Child fare (৳)</Label>
                <Input
                  id="child-fare"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={childFare}
                  onChange={(event) => {
                    setChildFare(event.target.value);
                    clearFeedback();
                  }}
                />
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save passenger pricing"}
            </Button>
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