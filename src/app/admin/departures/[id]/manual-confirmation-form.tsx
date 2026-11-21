"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ManualConfirmation } from "@/lib/manual-booking-confirmation";

const paymentOptions = [
  ["BKASH", "bKash"], ["NAGAD", "Nagad"], ["ROCKET", "Rocket"], ["DBBL", "DBBL"],
  ["CASH", "Cash"], ["BANK_TRANSFER", "Bank transfer"], ["OTHER", "Other"],
];

export default function ManualConfirmationForm({
  confirm,
  total,
  hasRoomRequest,
}: {
  confirm: (previous: ManualConfirmation | null, form: FormData) => Promise<ManualConfirmation>;
  total: string;
  hasRoomRequest: boolean;
}) {
  const [result, action, pending] = useActionState(confirm, null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [lodgingVerified, setLodgingVerified] = useState(false);
  const paymentRequired = !/^0+(?:\.0+)?$/.test(total);

  if (result && "confirmed" in result) return <p role="status">Booking confirmed.</p>;

  return (
    <form action={action} className="mt-4 rounded-md border bg-muted/30 p-3">
      <fieldset disabled={pending} className="space-y-3">
        <legend className="px-1 font-semibold">Manual verification</legend>
        {paymentRequired ? (
          <>
            <p className="text-muted-foreground">Check that the full ৳{total} was received before confirming.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid content-start gap-1">
                Verified amount (BDT)
                <Input name="paymentAmount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </label>
              <label className="grid content-start gap-1">
                Payment method
                <NativeSelect name="paymentMethod" className="w-full" value={method} onChange={(event) => setMethod(event.target.value)} required>
                  <NativeSelectOption value="" disabled>Select method</NativeSelectOption>
                  {paymentOptions.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
                </NativeSelect>
              </label>
              <label className="grid content-start gap-1">
                Receipt or transaction reference
                <Input name="paymentReference" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} required />
              </label>
            </div>
          </>
        ) : <p className="text-muted-foreground">No payment is due for this booking.</p>}
        {hasRoomRequest && (
          <div className="space-y-1">
            <a className="underline" href="#departure-hotel-stays">Review scheduled stays</a>
            <label className="flex items-start gap-2">
              <input name="lodgingVerified" type="checkbox" className="mt-0.5 size-4"
                checked={lodgingVerified} onChange={(event) => setLodgingVerified(event.target.checked)} required />
              I verified that the requested lodging is available for every stay.
            </label>
          </div>
        )}
        <Button type="submit">{pending ? "Confirming…" : "Confirm booking"}</Button>
      </fieldset>
      {result && "error" in result && <p role="alert" className="mt-2 text-destructive">{result.error}</p>}
    </form>
  );
}
