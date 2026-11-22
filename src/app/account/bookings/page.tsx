import Link from "next/link";
import { redirect } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { customerAuth, getCustomerSession } from "@/customer-auth";
import { PublicHeader } from "@/components/public-header";

export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" });
const deadline = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });
const statusLabels = {
  CONFIRMED: "নিশ্চিত",
  PENDING: "নিশ্চিতকরণের অপেক্ষায়",
  CANCELLED: "বাতিল",
  COMPLETED: "সম্পন্ন",
  REFUNDED: "টাকা ফেরত দেওয়া হয়েছে",
  EXPIRED: "সংরক্ষণের মেয়াদ শেষ",
};

export default async function CustomerBookingsPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect("/account/sign-in");

  const { db } = await import("@/prisma/db");
  const owned = await db.orm.public.CustomerBooking.where({ customerAccountId: customer.customerAccountId })
    .include("booking", (booking) => booking.select("bookingNumber", "status", "totalAmount", "holdExpiresAt")
      .include("departure", (departure) => departure.select("departureDate")
        .include("tour", (tour) => tour.select("title"))))
    .orderBy((link) => link.bookingId.desc())
    .all();

  const now = Temporal.Now.instant().epochMilliseconds;

  return (
    <div lang="bn" className="min-h-screen bg-[#f7f7ee] text-[#193d32]">
      <PublicHeader activePath="/account/bookings" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">আমার বুকিং</h1>
            {customer.user?.email && <p className="mt-2 break-all text-[#526558]">{customer.user.email}</p>}
          </div>
          <form action={async () => {
            "use server";
            if (!await getCustomerSession()) redirect("/account/sign-in");
            await customerAuth.signOut({ redirectTo: "/tours" });
          }}>
            <button type="submit" className="rounded-lg border border-[#cad2c4] px-3 py-2">সাইন আউট</button>
          </form>
        </div>
        {owned.length === 0 ? (
          <p className="mt-8 rounded-lg border border-[#cad2c4] p-4">
            এখনো কোনো বুকিং নেই। <Link href="/tours" className="underline underline-offset-4">ট্যুর দেখুন</Link>
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-[#cad2c4] rounded-lg border border-[#cad2c4] bg-white">
            {owned.map(({ bookingId, booking }) => {
              if (!booking?.departure) return null;
              const expired = booking.status === "PENDING" && booking.holdExpiresAt &&
                booking.holdExpiresAt.epochMilliseconds <= now;
              const status = expired ? "EXPIRED" : booking.status;
              return (
                <li key={bookingId} className="space-y-1 p-4 text-sm">
                  <h2 className="text-base font-semibold">{booking.departure.tour?.title}</h2>
                  <p>{date.format(booking.departure.departureDate.epochMilliseconds)}</p>
                  <p className="break-all">{booking.bookingNumber} · {statusLabels[status]}</p>
                  <p>মোট ভাড়া ৳{booking.totalAmount}</p>
                  {status === "PENDING" && booking.holdExpiresAt && (
                    <p>আসন সংরক্ষণের সময় {deadline.format(booking.holdExpiresAt.epochMilliseconds)} পর্যন্ত (বাংলাদেশ সময়)।</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
