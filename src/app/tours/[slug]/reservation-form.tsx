"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { PassengerCounts } from "@/lib/booking-quote";

type ReservationResponse =
  | { bookingNumber: string; holdExpiresAt: string }
  | { bookingNumber: string; status: "CONFIRMED" }
  | { error: string };

const bangla = new Intl.NumberFormat("bn-BD");
const deadlineFormat = new Intl.DateTimeFormat("bn-BD", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});
const inputClass = "mt-1 w-full rounded-lg border border-[#cad2c4] bg-white px-2 py-2 text-base text-[#193d32]";

export function ReservationForm({
  departureId,
  roomOptionId,
  quoteVersion,
  counts,
  customer,
}: {
  departureId: number;
  roomOptionId: number;
  quoteVersion: string;
  counts: PassengerCounts;
  customer?: { name?: string | null; email?: string | null };
}) {
  const reservationKey = useRef<string | null>(null);
  const [result, setResult] = useState<ReservationResponse | null>(null);
  const [pending, setPending] = useState(false);
  const totalTravelers = counts.adults + counts.children + counts.infants;

  if (totalTravelers > 20) {
    return <p className="mt-2 text-[#526558]">এক বুকিংয়ে সর্বোচ্চ ২০ জন যাত্রী যোগ করা যাবে।</p>;
  }

  if (result && "bookingNumber" in result) {
    const confirmed = "status" in result;
    return (
      <div role="status" className="mt-4 space-y-2 rounded-lg border border-[#cad2c4] bg-white p-3">
        <p className="font-semibold">{confirmed ? "বুকিং নিশ্চিত হয়েছে" : "আসন সাময়িকভাবে সংরক্ষিত হয়েছে"}</p>
        <p>বুকিং নম্বর <strong className="break-all">{result.bookingNumber}</strong></p>
        {!confirmed && (
          <>
            <p>সংরক্ষণের মেয়াদ {deadlineFormat.format(new Date(result.holdExpiresAt))} পর্যন্ত (বাংলাদেশ সময়)।</p>
            <p>রুমের অনুরোধটি বুকিংয়ের সঙ্গে জমা হয়েছে। চূড়ান্ত বুকিংয়ের জন্য নিশ্চিতকরণ প্রয়োজন।</p>
          </>
        )}
        {customer && <Link className="inline-block underline underline-offset-4" href="/account/bookings">আমার বুকিং দেখুন</Link>}
      </div>
    );
  }

  const groups = [
    { type: "ADULT", label: "প্রাপ্তবয়স্ক", count: counts.adults },
    { type: "CHILD", label: "শিশু", count: counts.children },
    { type: "INFANT", label: "২ বছরের কম বয়সী শিশু", count: counts.infants },
  ];

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setResult(null);
    try {
      reservationKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureId,
          roomOptionId,
          quoteVersion,
          reservationKey: reservationKey.current,
          mode: customer ? "customer" : undefined,
          contactName: form.get("contactName"),
          contactPhone: form.get("contactPhone"),
          contactEmail: form.get("contactEmail"),
          passengers: groups.flatMap(({ type, count }) =>
            Array.from({ length: count }, (_, index) => ({ type, name: form.get(`${type}-${index}`) }))
          ),
        }),
      });
      const data = await response.json() as ReservationResponse;
      setResult(data);
    } catch {
      setResult({ error: "সংযোগে সমস্যা হয়েছে। একই তথ্য দিয়ে আবার চেষ্টা করুন।" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={reserve} className="mt-4 border-t border-[#cad2c4] pt-3">
      <fieldset disabled={pending} className="space-y-3">
        <legend className="font-semibold">
          {customer ? "অ্যাকাউন্ট থেকে আসন সংরক্ষণ" : "অতিথি হিসেবে আসন সংরক্ষণ"}
        </legend>
        <p className="text-[#526558]">আসন ১৫ মিনিটের জন্য ধরে রাখা হবে। রুমের অনুরোধও জমা হবে।</p>
        <label className="block">
          যোগাযোগের নাম
          <input name="contactName" defaultValue={customer?.name ?? ""} autoComplete="name" maxLength={100} required className={inputClass} />
        </label>
        <label className="block">
          ফোন নম্বর
          <input name="contactPhone" type="tel" autoComplete="tel" maxLength={30} required className={inputClass} />
        </label>
        <label className="block">
          ইমেইল (ঐচ্ছিক)
          <input name="contactEmail" defaultValue={customer?.email ?? ""} type="email" autoComplete="email" maxLength={254} className={inputClass} />
        </label>
        {groups.flatMap(({ type, label, count }) => Array.from({ length: count }, (_, index) => (
          <label key={`${type}-${index}`} className="block">
            {label} {bangla.format(index + 1)}-এর নাম
            <input name={`${type}-${index}`} maxLength={100} required className={inputClass} />
          </label>
        )))}
        <button type="submit" className="w-full rounded-lg bg-[#254f3e] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#193d32]">
          {pending ? "আসন সংরক্ষণ হচ্ছে…" : "১৫ মিনিটের জন্য আসন ধরুন"}
        </button>
      </fieldset>
      {result && "error" in result && <p role="alert" className="mt-2 text-red-800">{result.error}</p>}
    </form>
  );
}
