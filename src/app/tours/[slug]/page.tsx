import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Noto_Sans_Bengali } from "next/font/google";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  ShieldCheck,
  Users,
  Bus,
  Bed,
} from "lucide-react";
import { getCustomerSession, isCustomerAuthConfigured } from "@/customer-auth";
import { getPublicTourBySlug } from "@/lib/catalog";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { TourCoverImage } from "@/components/tour-cover-image";
import { BookingQuoteForm } from "./booking-quote-form";

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  display: "swap",
});

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reserve?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicTourBySlug(slug);

  if (!data) {
    return {
      title: "ট্যুর পাওয়া যায়নি | Unmukto",
    };
  }

  return {
    title: `${data.tour.title} | Unmukto`,
    description: data.tour.description || `${data.tour.title} — উন্মুক্তর সাথে ভ্রমণের নতুন গল্প।`,
    openGraph: {
      title: `${data.tour.title} — Unmukto`,
      description: data.tour.description || "চেনা গণ্ডির বাইরে, নতুন পথের খোঁজে।",
      locale: "bn_BD",
      type: "website",
    },
  };
}

const roomTypeTitles: Record<string, string> = {
  SHARED: "শেয়ার্ড রুম (Shared Room)",
  COUPLE: "কাপল রুম (Couple Room)",
  PRIVATE: "প্রাইভেট / ফ্যামিলি রুম (Private Room)",
};

export default async function TourDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await getPublicTourBySlug(slug);

  if (!data) {
    notFound();
  }

  const { tour, itineraries, departures } = data;
  const [session, { reserve }] = await Promise.all([getCustomerSession(), searchParams]);
  const customer = session ? { name: session.user?.name, email: session.user?.email } : undefined;
  const customerSignIn = isCustomerAuthConfigured();
  const openDepartures = departures.filter((d) => d.bookingOpen);

  return (
    <div
      lang="bn"
      className={`min-h-screen flex flex-col bg-[#f7f7ee] text-[#193d32] ${bengali.className}`}
    >
      <PublicHeader activePath="/tours" />

      <main id="top" className="flex-1 pb-24">
        {/* Breadcrumb Navigation */}
        <div className="mx-auto max-w-[1300px] px-6 pt-6 text-xs text-[#61746a] md:px-12">
          <nav aria-label="ব্রেডক্রাম্ব" className="flex items-center gap-2">
            <Link href="/" className="hover:text-[#193d32]">
              হোম
            </Link>
            <span>/</span>
            <Link href="/tours" className="hover:text-[#193d32]">
              ট্যুর সমূহ
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#193d32] line-clamp-1">
              {tour.title}
            </span>
          </nav>
        </div>

        {/* Hero Banner */}
        <section className="mx-auto max-w-[1300px] px-6 pt-6 pb-10 md:px-12 md:pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#193d32] to-[#254f3e] p-8 text-white md:p-12">
            <TourCoverImage cover={tour.coverImage} sizes="(max-width: 1300px) 100vw, 1200px" />
            <div className="relative flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-medium backdrop-blur-sm">
                <Clock size={14} />
                {tour.durationLabel}
              </span>

              {openDepartures.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-[#b27433] px-3.5 py-1 text-xs font-semibold text-white">
                  বুকিং উন্মুক্ত রয়েছে
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-white/20 px-3.5 py-1 text-xs font-medium text-white/90">
                  আসন্ন সূচি
                </span>
              )}
            </div>

            <h1 className="relative mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              {tour.title}
            </h1>

            {tour.description && (
              <p className="relative mt-4 max-w-3xl text-base leading-relaxed text-[#f4f1d9] md:text-lg">
                {tour.description}
              </p>
            )}
          </div>
        </section>

        {/* Main Content Layout */}
        <div className="mx-auto max-w-[1300px] px-6 md:px-12">
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left 2 Cols: Itinerary & Inclusions */}
            <div className="space-y-10 lg:col-span-2">
              {/* Day-by-Day Itinerary */}
              <section className="rounded-2xl border border-[#cad2c4] bg-white p-6 md:p-8">
                <h2 className="flex items-center gap-2.5 text-2xl font-bold text-[#193d32]">
                  <Compass size={24} className="text-[#b27433]" />
                  দিনভিত্তিক ভ্রমণ পরিকল্পনা
                </h2>

                {itineraries.length === 0 ? (
                  <p className="mt-4 text-sm text-[#61746a]">
                    এই ট্যুরের বিস্তারিত ভ্রমণসূচি শীঘ্রই প্রকাশ করা হবে।
                  </p>
                ) : (
                  <div className="mt-8 space-y-8">
                    {itineraries.map((itinerary) => (
                      <div
                        key={itinerary.id}
                        className="relative border-l-2 border-[#d6ddcd] pl-6 md:pl-8"
                      >
                        {/* Day Marker */}
                        <div className="absolute -left-[17px] top-0 flex size-8 items-center justify-center rounded-full bg-[#193d32] text-xs font-bold text-white ring-4 ring-white">
                          {itinerary.dayNumber}
                        </div>

                        <div>
                          <span className="text-xs font-semibold tracking-wider text-[#b27433]">
                            দিন ০{itinerary.dayNumber}
                          </span>
                          <h3 className="text-lg font-bold text-[#193d32] md:text-xl">
                            {itinerary.title}
                          </h3>

                          {itinerary.description && (
                            <p className="mt-2 text-sm leading-relaxed text-[#61746a]">
                              {itinerary.description}
                            </p>
                          )}

                          {/* Destinations in this day */}
                          {itinerary.destinations.length > 0 && (
                            <div className="mt-4 space-y-2 rounded-xl bg-[#edf0e4]/60 p-4">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#193d32]">
                                গন্তব্য ও কার্যক্রম:
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {itinerary.destinations.map((dest) => (
                                  <div
                                    key={dest.id}
                                    className="flex items-start gap-2 text-xs"
                                  >
                                    <MapPin
                                      size={14}
                                      className="mt-0.5 shrink-0 text-[#517455]"
                                    />
                                    <div>
                                      <strong className="text-[#193d32]">
                                        {dest.name}
                                      </strong>
                                      {(dest.arrivalTime || dest.departureTime) && (
                                        <span className="ml-1 text-[#61746a]">
                                          ({dest.arrivalTime ? `পৌঁছানো ${dest.arrivalTime}` : ""}
                                          {dest.arrivalTime && dest.departureTime ? " — " : ""}
                                          {dest.departureTime ? `প্রস্থান ${dest.departureTime}` : ""})
                                        </span>
                                      )}
                                      {dest.description && (
                                        <p className="mt-0.5 text-[#61746a]">
                                          {dest.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* What's Included */}
              <section className="rounded-2xl border border-[#cad2c4] bg-white p-6 md:p-8">
                <h2 className="flex items-center gap-2.5 text-2xl font-bold text-[#193d32]">
                  <ShieldCheck size={24} className="text-[#b27433]" />
                  ট্যুর প্যাকেজে যা যা থাকছে
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl border border-[#edf0e4] bg-[#f7f7ee]/60 p-4">
                    <Bus size={20} className="mt-0.5 shrink-0 text-[#193d32]" />
                    <div>
                      <h3 className="font-semibold text-sm text-[#193d32]">
                        নির্ধারিত যাতায়াত ব্যবস্থা
                      </h3>
                      <p className="mt-1 text-xs text-[#61746a]">
                        ঢাকা থেকে গন্তব্যে যাওয়া এবং ভ্রমণ চলাকালীন নির্ধারিত যানবাহনের নিশ্চয়তা।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[#edf0e4] bg-[#f7f7ee]/60 p-4">
                    <Bed size={20} className="mt-0.5 shrink-0 text-[#193d32]" />
                    <div>
                      <h3 className="font-semibold text-sm text-[#193d32]">
                        মানসম্মত থাকার ব্যবস্থা
                      </h3>
                      <p className="mt-1 text-xs text-[#61746a]">
                        পছন্দ অনুযায়ী কাপল, ফ্যামিলি অথবা শেয়ার্ড রুমে নিরাপদ রাত্রিযাপন।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[#edf0e4] bg-[#f7f7ee]/60 p-4">
                    <Users size={20} className="mt-0.5 shrink-0 text-[#193d32]" />
                    <div>
                      <h3 className="font-semibold text-sm text-[#193d32]">
                        অভিজ্ঞ ট্যুর গাইড
                      </h3>
                      <p className="mt-1 text-xs text-[#61746a]">
                        পুরো ট্যুর জুড়েই থাকবেন উন্মুক্তর দায়িত্বশীল গাইড ও সার্বক্ষণিক সহযোগিতা।
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[#edf0e4] bg-[#f7f7ee]/60 p-4">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#193d32]" />
                    <div>
                      <h3 className="font-semibold text-sm text-[#193d32]">
                        স্বচ্ছ নীতিমালা ও কোনো লুকানো খরচ নেই
                      </h3>
                      <p className="mt-1 text-xs text-[#61746a]">
                        বুকিংয়ের সময় নির্ধারিত ভাড়াই চূড়ান্ত। কোনো গোপন বা বাড়তি চার্জ নেই।
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Departures, Pricing & Booking */}
            <div className="space-y-6">
              {/* Departures Card */}
              <div className="rounded-2xl border border-[#cad2c4] bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-xl font-bold text-[#193d32]">
                  <Calendar size={20} className="text-[#b27433]" />
                  নির্ধারিত যাত্রার তারিখ ও আসন
                </h2>

                {departures.length === 0 ? (
                  <p className="mt-4 text-sm text-[#61746a]">
                    এই মুহূর্তে কোনো প্রকাশ্য যাত্রা নির্ধারিত নেই। পরবর্তী যাত্রার ঘোষণার জন্য সাথে থাকুন।
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {departures.map((dep) => (
                      <div
                        key={dep.id}
                        id={`departure-${dep.id}`}
                        className="scroll-mt-4 rounded-xl border border-[#cad2c4] bg-[#f7f7ee]/50 p-4 transition-all hover:border-[#193d32]/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="block text-sm font-semibold text-[#193d32]">
                              যাত্রা: {dep.departureDate}
                              {dep.departureTime ? ` (${dep.departureTime})` : ""}
                            </strong>
                            {dep.returnDate && (
                              <span className="block text-xs text-[#61746a]">
                                ফেরা: {dep.returnDate}
                                {dep.returnTime ? ` (${dep.returnTime})` : ""}
                              </span>
                            )}
                          </div>

                          {dep.isSoldOut ? (
                            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                              আসন পূর্ণ
                            </span>
                          ) : dep.bookingOpen ? (
                            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-800">
                              {dep.availableSeats > 0
                                ? `${dep.availableSeats}টি আসন বাকি`
                                : "বুকিং চলছে"}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              বুকিং বন্ধ
                            </span>
                          )}
                        </div>

                        {dep.vehiclesSummary.length > 0 && (
                          <div className="mt-2 text-xs text-[#526558]">
                            বাহন: {dep.vehiclesSummary.join(", ")}
                          </div>
                        )}

                        {dep.pricing && (
                          <div className="mt-3 flex items-baseline justify-between border-t border-[#edf0e4] pt-2 text-xs">
                            <span className="text-[#61746a]">মূল প্যাকেজ মূল্য:</span>
                            <strong className="text-sm font-bold text-[#193d32]">
                              ৳{Number(dep.pricing.adultFare).toLocaleString("en-IN")}
                              <span className="text-xs font-normal text-[#61746a]">/জন</span>
                            </strong>
                          </div>
                        )}
                        {dep.bookingOpen && dep.pricing && dep.roomOptions.length > 0 && (
                          <BookingQuoteForm
                            departureId={dep.id}
                            customer={customer}
                            openInitially={Boolean(customer) && reserve === String(dep.id)}
                            signInHref={customerSignIn ? `/account/sign-in?next=${encodeURIComponent(`/tours/${slug}#departure-${dep.id}`)}` : undefined}
                            rooms={dep.roomOptions.map((room) => ({
                              id: room.id,
                              label: roomTypeTitles[room.roomType],
                            }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing & Accommodation Rules Card */}
              <div className="rounded-2xl border border-[#cad2c4] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#193d32]">
                  ভাড়া ও রুমের বিবরণ
                </h2>

                <div className="mt-4 space-y-4 text-xs text-[#526558]">
                  <div className="rounded-lg bg-[#edf0e4]/50 p-3">
                    <p className="font-semibold text-[#193d32]">
                      যাত্রী ও সিটের নিয়মাবলী:
                    </p>
                    <ul className="mt-1.5 list-disc pl-4 space-y-1 text-[#61746a]">
                      <li>প্রতিটি বুকিংয়ে কমপক্ষে একজন প্রাপ্তবয়স্ক থাকতে হবে।</li>
                      <li>শিশুদের জন্য শিশু ভাড়া প্রযোজ্য (প্রযোজ্য ক্ষেত্রে আলাদা সিট সংরক্ষিত হবে)।</li>
                      <li>২ বছরের কম বয়সী শিশুদের জন্য কোনো ভাড়া বা আলাদা সিটের প্রয়োজন নেই।</li>
                    </ul>
                  </div>

                  {departures[0]?.roomOptions && departures[0].roomOptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-[#193d32]">
                        রুম ক্যাটাগরি ও সারচার্জ (প্রতি বুকিং):
                      </p>
                      {departures[0].roomOptions.map((ro) => (
                        <div
                          key={ro.id}
                          className="flex items-center justify-between rounded-lg border border-[#cad2c4] p-2.5"
                        >
                          <div>
                            <strong className="block text-[#193d32]">
                              {roomTypeTitles[ro.roomType] ?? ro.roomType}
                            </strong>
                            {ro.description && (
                              <span className="text-[11px] text-[#61746a]">
                                {ro.description}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-[#193d32]">
                            {Number(ro.surcharge) === 0
                              ? "অতিরিক্ত খরচ নেই"
                              : `+ ৳${Number(ro.surcharge).toLocaleString("en-IN")}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-[#edf0e4] pt-4">
                  <p className="text-center text-xs text-[#61746a]">
                    ট্যুর সংক্রান্ত যেকোনো প্রশ্নে যোগাযোগ করুন আমাদের ফেসবুক পেজে অথবা সরাসরি ফোন করুন।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
