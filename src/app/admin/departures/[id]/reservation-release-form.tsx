"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReservationReleaseResult } from "@/lib/reservation-release";

export default function ReservationReleaseForm({ release }: {
  release: (previous: ReservationReleaseResult | null, form: FormData) => Promise<ReservationReleaseResult>;
}) {
  const [result, action, pending] = useActionState(release, null);
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);

  if (result && "released" in result) return <p role="status">Hold released.</p>;

  return (
    <details className="mt-4 rounded-md border p-3">
      <summary className="cursor-pointer font-semibold">Release unpaid hold</summary>
      <form action={action} className="mt-3">
        <fieldset disabled={pending} className="space-y-3">
          <label className="grid gap-1">
            Reason for release
            <Textarea name="reason" required maxLength={500} rows={2}
              value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="flex items-start gap-2">
            <input name="unpaidVerified" type="checkbox" className="mt-0.5 size-4" required
              checked={verified} onChange={(event) => setVerified(event.target.checked)} />
            I verified that no payment was received.
          </label>
          <p className="text-muted-foreground">Released seats and any rooms held at checkout become available to other bookings.</p>
          <Button type="submit" variant="destructive">{pending ? "Releasing…" : "Release hold"}</Button>
        </fieldset>
        {result && "error" in result && <p role="alert" className="mt-2 text-destructive">{result.error}</p>}
      </form>
    </details>
  );
}
