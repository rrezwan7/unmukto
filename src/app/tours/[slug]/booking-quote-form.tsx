"use client";

import { useState, type FormEvent } from "react";
import type { BookingQuote } from "@/lib/booking-quote";

type QuoteResponse = { quote: BookingQuote } | { error: string };

const banglaNumber = new Intl.NumberFormat("bn-BD");
const banglaFraction = new Intl.NumberFormat("bn-BD", { minimumIntegerDigits: 2 });
const inputClass = "mt-1 w-full rounded-lg border border-[#cad2c4] bg-white px-2 py-2 text-base text-[#193d32]";
const passengerFields = [
  { name: "adults", label: "প্রাপ্তবয়স্ক", minimum: 1 },
  { name: "children", label: "শিশু", minimum: 0 },
  { name: "infants", label: "২ বছরের কম", minimum: 0 },
];

function money(amount: string) {
  const [taka, poisha] = amount.split(".");
  const fraction = poisha === "00" ? "" : `.${banglaFraction.format(Number(poisha))}`;
  return `৳${banglaNumber.format(BigInt(taka))}${fraction}`;
}

export function BookingQuoteForm({
  departureId,
  rooms,
}: {
  departureId: number;
  rooms: { id: number; label: string }[];
}) {
  const [result, setResult] = useState<QuoteResponse | null>(null);
  const [pending, setPending] = useState(false);

  async function requestQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setResult(null);

    try {
      const response = await fetch("/api/booking-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureId,
          roomOptionId: Number(form.get("roomOptionId")),
          adults: Number(form.get("adults")),
          children: Number(form.get("children")),
          infants: Number(form.get("infants")),
        }),
      });
      setResult(await response.json() as QuoteResponse);
    } catch {
      setResult({ error: "এখন ভাড়া হিসাব করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।" });
    } finally {
      setPending(false);
    }
  }

  const quote = result && "quote" in result ? result.quote : null;

  return (
    <details className="mt-4 border-t border-[#cad2c4] pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#193d32]">
        দলের ভাড়া হিসাব করুন
      </summary>
      <form onSubmit={requestQuote} onChange={() => setResult(null)} className="mt-3 text-xs">
        <fieldset disabled={pending} className="space-y-3 disabled:opacity-70">
          <div className="grid grid-cols-2 gap-2 min-[375px]:grid-cols-3">
            {passengerFields.map(({ name, label, minimum }) => (
              <label key={name} className="min-w-0">
                {label}
                <input name={name} type="number" min={minimum} step="1" defaultValue={minimum} required className={inputClass} />
              </label>
            ))}
          </div>
          <label className="block">
            রুমের ধরন
            <select name="roomOptionId" className={inputClass} required defaultValue={rooms.length === 1 ? rooms[0].id : ""}>
              <option value="" disabled>রুম বেছে নিন</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
            </select>
          </label>
          <button type="submit" className="w-full rounded-lg bg-[#254f3e] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#193d32]">
            {pending ? "ভাড়া হিসাব হচ্ছে…" : "মোট ভাড়া দেখুন"}
          </button>
        </fieldset>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {result && "error" in result && <p className="mt-3 text-xs text-red-800">{result.error}</p>}
        {quote && (
          <div className="mt-3 rounded-lg bg-[#e9ecdf] p-3 text-xs">
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-2"><dt>প্রাপ্তবয়স্কদের ভাড়া</dt><dd>{money(quote.adultSubtotal)}</dd></div>
              <div className="flex justify-between gap-2"><dt>শিশুদের ভাড়া</dt><dd>{money(quote.childSubtotal)}</dd></div>
              <div className="flex justify-between gap-2"><dt>রুম সারচার্জ</dt><dd>{money(quote.roomSurcharge)}</dd></div>
              <div className="flex justify-between gap-2 border-t border-[#cad2c4] pt-1.5 font-bold"><dt>মোট ভাড়া</dt><dd>{money(quote.total)}</dd></div>
              <div className="flex justify-between gap-2"><dt>প্রয়োজনীয় আসন</dt><dd>{banglaNumber.format(quote.seatsRequired)}টি</dd></div>
            </dl>
            <p className="mt-2 text-[#526558]">এটি ভাড়ার হিসাব। আসন ও রুম সংরক্ষণ সুবিধা শিগগিরই যুক্ত হবে।</p>
          </div>
        )}
      </div>
    </details>
  );
}
